import { app } from 'electron'
import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { URL } from 'url'

export interface ReleaseAssetInfo {
  name: string
  size: number
  downloadUrl: string
}

export interface UpdateCheckResult {
  success: boolean
  updateAvailable: boolean
  currentVersion: string
  latestVersion?: string
  releaseName?: string
  releaseNotes?: string
  publishedAt?: string
  releaseUrl?: string
  asset?: ReleaseAssetInfo
  error?: string
}

export interface UpdateDownloadProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

// Parse version string (e.g. "v1.2.0" -> [1, 2, 0])
export function parseSemver(v: string): number[] {
  if (!v) return [0, 0, 0]
  const clean = v.trim().replace(/^[vV]/, '').split(/[-+]/)[0]
  return clean.split('.').map((part) => parseInt(part, 10) || 0)
}

// Returns true if latest > current
export function isVersionNewer(latest: string, current: string): boolean {
  const l = parseSemver(latest)
  const c = parseSemver(current)
  const maxLen = Math.max(l.length, c.length)
  for (let i = 0; i < maxLen; i++) {
    const lPart = l[i] !== undefined ? l[i] : 0
    const cPart = c[i] !== undefined ? c[i] : 0
    if (lPart > cPart) return true
    if (lPart < cPart) return false
  }
  return false
}

export class UpdateService {
  private owner = 'Yokia'
  private repo = 'Relay'
  private activeDownloadRequest: http.ClientRequest | null = null
  private activeDownloadStream: fs.WriteStream | null = null
  private downloadedFilePath: string | null = null

  /**
   * Check GitHub Releases for updates
   */
  public async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion() || '1.0.0'

    try {
      const releaseData = await this.fetchLatestRelease()
      if (!releaseData || !releaseData.tag_name) {
        return {
          success: true,
          updateAvailable: false,
          currentVersion
        }
      }

      const latestVersion = releaseData.tag_name.replace(/^[vV]/, '')
      const updateAvailable = isVersionNewer(latestVersion, currentVersion)

      // Look for a Windows .exe installer in release assets
      const assets = Array.isArray(releaseData.assets) ? releaseData.assets : []
      const exeAsset =
        assets.find((a: any) => typeof a.name === 'string' && a.name.toLowerCase().endsWith('.exe')) ||
        assets[0]

      const assetInfo: ReleaseAssetInfo | undefined = exeAsset
        ? {
            name: exeAsset.name,
            size: Number(exeAsset.size) || 0,
            downloadUrl: exeAsset.browser_download_url
          }
        : undefined

      return {
        success: true,
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseName: releaseData.name || `v${latestVersion}`,
        releaseNotes: releaseData.body || '',
        publishedAt: releaseData.published_at,
        releaseUrl: releaseData.html_url || `https://github.com/${this.owner}/${this.repo}/releases`,
        asset: assetInfo
      }
    } catch (err: any) {
      console.error('[UpdateService] Check failed:', err)
      return {
        success: false,
        updateAvailable: false,
        currentVersion,
        error: err.message || 'Failed to fetch release info from GitHub'
      }
    }
  }

  /**
   * Download update installer with progress reporting
   */
  public async downloadUpdate(
    downloadUrl: string,
    onProgress: (progress: UpdateDownloadProgress) => void
  ): Promise<string> {
    this.cancelDownload()

    const tempDir = app.getPath('temp')
    const fileName = `Relay-Update-${Date.now()}.exe`
    const targetPath = path.join(tempDir, fileName)
    this.downloadedFilePath = targetPath

    return new Promise((resolve, reject) => {
      let isCancelled = false
      let fileStream: fs.WriteStream | null = null

      const doDownload = (targetUrl: string, redirectCount = 0) => {
        if (redirectCount > 8) {
          reject(new Error('Too many HTTP redirects'))
          return
        }

        const parsedUrl = new URL(targetUrl)
        const client = parsedUrl.protocol === 'http:' ? http : https

        const req = client.get(
          targetUrl,
          {
            headers: {
              'User-Agent': 'Relay-App/AutoUpdater',
              Accept: 'application/octet-stream'
            }
          },
          (res) => {
            // Handle redirects (e.g. GitHub release assets redirect to AWS S3 via 302)
            if (
              res.statusCode &&
              [301, 302, 303, 307, 308].includes(res.statusCode) &&
              res.headers.location
            ) {
              const redirectUrl = new URL(res.headers.location, targetUrl).toString()
              doDownload(redirectUrl, redirectCount + 1)
              return
            }

            if (res.statusCode !== 200) {
              reject(new Error(`Download failed with HTTP status ${res.statusCode}`))
              return
            }

            const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
            let transferredBytes = 0
            let lastTransferred = 0
            let lastTime = Date.now()
            let bytesPerSecond = 0

            fileStream = fs.createWriteStream(targetPath)
            this.activeDownloadStream = fileStream

            res.on('data', (chunk: Buffer) => {
              if (isCancelled) return
              transferredBytes += chunk.length

              const now = Date.now()
              const elapsed = (now - lastTime) / 1000
              if (elapsed >= 0.25) {
                bytesPerSecond = Math.round((transferredBytes - lastTransferred) / elapsed)
                lastTransferred = transferredBytes
                lastTime = now

                const percent = totalBytes > 0 ? Math.min(100, Math.round((transferredBytes / totalBytes) * 100)) : 0
                onProgress({
                  percent,
                  transferred: transferredBytes,
                  total: totalBytes,
                  bytesPerSecond
                })
              }
            })

            res.pipe(fileStream)

            fileStream.on('finish', () => {
              if (isCancelled) return
              // Send final 100% progress
              onProgress({
                percent: 100,
                transferred: transferredBytes,
                total: totalBytes || transferredBytes,
                bytesPerSecond: 0
              })
              resolve(targetPath)
            })

            fileStream.on('error', (err) => {
              reject(err)
            })
          }
        )

        this.activeDownloadRequest = req

        req.on('error', (err) => {
          if (!isCancelled) {
            reject(err)
          }
        })
      }

      doDownload(downloadUrl)
    })
  }

  /**
   * Cancel ongoing download
   */
  public cancelDownload(): void {
    if (this.activeDownloadRequest) {
      this.activeDownloadRequest.destroy()
      this.activeDownloadRequest = null
    }
    if (this.activeDownloadStream) {
      this.activeDownloadStream.close()
      this.activeDownloadStream = null
    }
    if (this.downloadedFilePath && fs.existsSync(this.downloadedFilePath)) {
      try {
        fs.unlinkSync(this.downloadedFilePath)
      } catch {}
      this.downloadedFilePath = null
    }
  }

  /**
   * Launch installer and exit Relay to allow clean overwrite
   */
  public installAndRestart(installerPath?: string): boolean {
    const finalPath = installerPath || this.downloadedFilePath
    if (!finalPath || !fs.existsSync(finalPath)) {
      console.error('[UpdateService] Installer not found:', finalPath)
      return false
    }

    try {
      // Launch installer detached
      const child = spawn(finalPath, [], {
        detached: true,
        stdio: 'ignore'
      })
      child.unref()

      // Gracefully quit current app
      setTimeout(() => {
        app.quit()
      }, 500)
      return true
    } catch (err) {
      console.error('[UpdateService] Failed to launch installer:', err)
      return false
    }
  }

  private fetchLatestRelease(): Promise<any> {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent': 'Relay-App/AutoUpdater',
          Accept: 'application/vnd.github.v3+json'
        }
      }

      https
        .get(url, options, (res) => {
          if (res.statusCode === 404) {
            // No releases yet
            resolve(null)
            return
          }
          if (res.statusCode !== 200) {
            reject(new Error(`GitHub API returned status ${res.statusCode}`))
            return
          }

          let rawData = ''
          res.on('data', (chunk) => {
            rawData += chunk
          })
          res.on('end', () => {
            try {
              const parsed = JSON.parse(rawData)
              resolve(parsed)
            } catch (e) {
              reject(e)
            }
          })
        })
        .on('error', (err) => {
          reject(err)
        })
    })
  }
}

export const updateService = new UpdateService()

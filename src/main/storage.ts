import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface StorageData {
  history: any[]
  collections: any[]
  environments: any[]
  constants?: any[]
  settings?: any
  activeEnvironmentId?: string
}

const defaultData: StorageData = {
  history: [],
  settings: {
    autoSave: false,
    timeout: 30000,
    sslVerify: true
  },
  constants: [
    {
      id: 'c-server',
      name: 'server',
      currentValue: 'http://localhost',
      options: ['http://localhost', 'http://127.0.0.1', 'http://192.168.1.100', 'https://api.dev.local'],
      description: 'Target server host/IP'
    },
    {
      id: 'c-port',
      name: 'port',
      currentValue: '8080',
      options: ['3000', '8080', '8000', '5000', '9000'],
      description: 'Server listening port'
    },
    {
      id: 'c-baseurl',
      name: 'baseUrl',
      currentValue: 'https://jsonplaceholder.typicode.com',
      options: ['https://jsonplaceholder.typicode.com', 'https://api.github.com'],
      description: 'Public API base URL'
    }
  ],
  collections: [
    {
      id: 'default-col',
      name: 'Sample Collection',
      requests: [
        {
          id: 'req-sample-1',
          name: 'Get Users List',
          method: 'GET',
          url: 'https://jsonplaceholder.typicode.com/users',
          headers: [],
          params: [{ key: 'page', value: '1', enabled: true }],
          bodyType: 'none',
          bodyRaw: ''
        },
        {
          id: 'req-sample-2',
          name: 'Create Post',
          method: 'POST',
          url: 'https://jsonplaceholder.typicode.com/posts',
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          params: [],
          bodyType: 'json',
          bodyRaw: JSON.stringify({ title: 'foo', body: 'bar', userId: 1 }, null, 2)
        }
      ]
    }
  ],
  environments: [
    {
      id: 'env-default',
      name: 'Development',
      variables: [
        {
          key: 'server',
          value: 'http://localhost',
          enabled: true,
          options: ['http://localhost', 'http://127.0.0.1', 'http://192.168.1.100', 'https://api.dev.local']
        },
        {
          key: 'port',
          value: '3000',
          enabled: true,
          options: ['3000', '8080', '8000', '5000', '9000']
        },
        {
          key: 'baseUrl',
          value: 'https://jsonplaceholder.typicode.com',
          enabled: true,
          options: ['https://jsonplaceholder.typicode.com', 'https://api.github.com']
        }
      ]
    }
  ],
  activeEnvironmentId: 'env-default'
}

export class StorageService {
  private filePath: string
  private cache: StorageData

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'relay-data.json')
    this.cache = this.load()
  }

  private load(): StorageData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8')
        return { ...defaultData, ...JSON.parse(raw) }
      }
    } catch (e) {
      console.error('Failed to load storage data:', e)
    }
    return defaultData
  }

  public getData(): StorageData {
    return this.cache
  }

  public saveData(data: Partial<StorageData>): StorageData {
    this.cache = { ...this.cache, ...data }
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2), 'utf-8')
    } catch (e) {
      console.error('Failed to save storage data:', e)
    }
    return this.cache
  }
}

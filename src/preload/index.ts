import { contextBridge, ipcRenderer } from 'electron'
import { createAccountingApi } from './api'

contextBridge.exposeInMainWorld('accountingApi', createAccountingApi((channel, payload) => ipcRenderer.invoke(channel, payload)))

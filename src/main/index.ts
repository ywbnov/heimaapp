import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'node:path'
import { appendFile, writeFile, readFile } from 'node:fs/promises'
import { openDatabase } from './database'
import { registerIpcHandlers } from './ipc'
import { CategoryRepository } from './repositories/categoryRepository'
import { ExpenseRepository } from './repositories/expenseRepository'
import { createBackupJson, exportCsv, restoreBackupJson } from './exportService'

let database: ReturnType<typeof openDatabase> | undefined

app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')

async function logStartup(message: string, error?: unknown) {
  try {
    const suffix = error instanceof Error ? `\n${error.stack ?? error.message}` : ''
    const userData = app.getPath('userData')
    await appendFile(join(userData, 'startup.log'), `[${new Date().toISOString()}] ${message}${suffix}\n`, 'utf8')
  } catch {
    // Startup logging must never prevent the app from opening.
  }
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    title: '黑马记账',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void window.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    void logStartup(`渲染页面加载失败 ${errorCode} ${errorDescription} ${validatedURL}`)
  })
  window.webContents.on('render-process-gone', (_event, details) => {
    void logStartup(`渲染进程退出 ${details.reason} ${details.exitCode}`)
  })
}

app.whenReady().then(() => {
  void logStartup('开始启动')
  try {
    const db = openDatabase(join(app.getPath('userData'), 'heima-accounting.sqlite'))
    database = db
    const expenseRepository = new ExpenseRepository(db)
    const categoryRepository = new CategoryRepository(db)
    registerIpcHandlers(ipcMain, {
    expenses: expenseRepository,
    categories: categoryRepository,
    data: {
      async exportCsv() {
        const result = await dialog.showSaveDialog({
          title: '导出账目 CSV',
          defaultPath: join(app.getPath('documents'), '黑马记账-账目.csv'),
          filters: [{ name: 'CSV 文件', extensions: ['csv'] }]
        })
        if (!result.canceled && result.filePath) await writeFile(result.filePath, exportCsv(expenseRepository.list()), 'utf8')
      },
      async backupJson() {
        const result = await dialog.showSaveDialog({
          title: '备份黑马记账数据',
          defaultPath: join(app.getPath('documents'), '黑马记账-备份.json'),
          filters: [{ name: 'JSON 文件', extensions: ['json'] }]
        })
        if (!result.canceled && result.filePath) await writeFile(result.filePath, createBackupJson(db), 'utf8')
      },
      async restoreJson() {
        const result = await dialog.showOpenDialog({
          title: '恢复黑马记账数据',
          properties: ['openFile'],
          filters: [{ name: 'JSON 文件', extensions: ['json'] }]
        })
        if (result.canceled || !result.filePaths[0]) return 0
        const content = await readFile(result.filePaths[0], 'utf8')
        return restoreBackupJson(db, content)
      }
    }
    })
    createWindow()
    void logStartup('窗口创建完成')
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  } catch (error) {
    void logStartup('主进程启动失败', error)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  database?.close()
  if (process.platform !== 'darwin') app.quit()
})

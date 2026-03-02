// Test script to verify path expansion
import { expandPath, toPortablePath } from './packages/shared/src/utils/paths.ts'
import { homedir } from 'os'

console.log('=== Path Testing ===')
console.log('homedir():', homedir())

const testPaths = [
  '~/.iweather/workspaces/my-workspace',
  '~\\iweather\\workspaces\\my-workspace',
  'C:\\Users\\DELL\\.iweather\\workspaces\\my-workspace',
]

for (const path of testPaths) {
  console.log(`\nInput: "${path}"`)
  console.log(`expandPath: "${expandPath(path)}"`)
  console.log(`toPortablePath: "${toPortablePath(path)}"`)
}

// Test session loading
console.log('\n=== Session Loading Test ===')
import { listSessions } from './packages/shared/src/sessions/storage.ts'
import { getWorkspaces } from './packages/shared/src/config/storage.ts'

console.log('Getting workspaces...')
const workspaces = getWorkspaces()
console.log('Workspaces:', workspaces.length)

for (const ws of workspaces) {
  console.log(`\nWorkspace: ${ws.name}`)
  console.log(`  rootPath: ${ws.rootPath}`)
  const sessions = listSessions(ws.rootPath)
  console.log(`  sessions count: ${sessions.length}`)
  if (sessions.length > 0) {
    console.log(`  first session: ${sessions[0].id}`)
  }
}

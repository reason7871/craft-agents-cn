/**
 * Electron Builder AfterPack Hook
 *
 * This hook runs after the app is packed but before it is built into an installer.
 * Currently used for macOS 26+ Liquid Glass icon compilation.
 */

module.exports = async function (context) {
  // Only run on macOS
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  // TODO: Add macOS Liquid Glass icon compilation logic here if needed
  console.log('  • afterPack hook completed (macOS)')
}

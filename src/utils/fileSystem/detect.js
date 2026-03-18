export const isElectron = () => typeof window !== 'undefined' && !!window?.electronAPI

export const hasFileSystemAccess = () =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

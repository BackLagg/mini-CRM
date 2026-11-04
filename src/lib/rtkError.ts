export function getRtkErrorMessage(error: unknown, fallback = 'Ошибка'): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: string }).message)
  }
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const inner = (error as { error: unknown }).error
    if (typeof inner === 'string') return inner
    if (typeof inner === 'object' && inner !== null && 'message' in inner) {
      return String((inner as { message: string }).message)
    }
  }
  return fallback
}

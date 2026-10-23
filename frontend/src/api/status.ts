export type ServerStatusResponse = {
  status: string
  database: string
}

export async function fetchStatus(): Promise<ServerStatusResponse> {
  const response = await fetch('/api/status')
  if (!response.ok) {
    throw new Error(`status ${response.status}`)
  }
  return response.json()
}

/**
 * API Service for centralized interaction with the Next.js API routes.
 * Provides standardized error handling and request patterns.
 */

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`
    try {
      const errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      // Fallback to default message if JSON parsing fails
    }
    throw new Error(errorMessage)
  }
  
  // For DELETE or empty responses
  if (response.status === 204) return {} as T
  
  return response.json()
}

export const apiService = {
  get: <T>(url: string) => fetch(url).then(res => handleResponse<T>(res)),
  
  post: <T>(url: string, data: unknown) => 
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => handleResponse<T>(res)),
    
  patch: <T>(url: string, data: unknown) => 
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => handleResponse<T>(res)),
    
  delete: <T>(url: string) => 
    fetch(url, { method: 'DELETE' }).then(res => handleResponse<T>(res)),
}

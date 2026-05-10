import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const apiKey = process.env.WATZAP_API_KEY
    const numberKey = process.env.WATZAP_NUMBER_KEY

    if (!apiKey || !numberKey) {
      return NextResponse.json({ error: 'API Key atau Number Key Watzap belum dikonfigurasi di .env' }, { status: 400 })
    }

    const res = await fetch('https://api.watzap.id/v1/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        number_key: numberKey,
      }),
    })

    const result = await res.json()

    if (result.status !== '200' && result.status !== 200) {
      return NextResponse.json({ 
        error: `Watzap Error (${result.status}): ${result.message || 'Parameter salah atau perangkat tidak terhubung'}`,
        details: result
      }, { status: 500 })
    }

    // Handle various possible response formats
    let groups = []
    
    // Watzap v1/groups returns an object where keys are group IDs
    if (result.groups && typeof result.groups === 'object' && !Array.isArray(result.groups)) {
      groups = Object.entries(result.groups).map(([id, data]: [string, any]) => ({
        id: id,
        name: data.name || id
      }))
    } else if (Array.isArray(result.data)) {
      groups = result.data.map((g: any) => ({ id: g.groupid || g.id, name: g.name || g.groupname }))
    } else if (Array.isArray(result.groups)) {
      groups = result.groups.map((g: any) => ({ id: g.groupid || g.id, name: g.name || g.groupname }))
    } else if (result.data && Array.isArray(result.data.groups)) {
      groups = result.data.groups.map((g: any) => ({ id: g.groupid || g.id, name: g.name || g.groupname }))
    } else if (Array.isArray(result.group_list)) {
      groups = result.group_list.map((g: any) => ({ id: g.groupid || g.id, name: g.name || g.groupname }))
    }

    return NextResponse.json({ groups })
  } catch (error: any) {
    console.error('Groups API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

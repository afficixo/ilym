import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { Client } from 'pg'

const mediaDbUrl = process.env.MEDIA_DB

const allowedMimeTypes = new Set(['image/png', 'image/gif', 'image/jpeg', 'image/jpg'])

function getUploadUrl(fileName: string) {
  return `/uploads/${fileName}`
}

export async function POST(request: Request) {
  try {
    if (!mediaDbUrl) {
      return NextResponse.json({ error: 'MEDIA_DB is not configured.' }, { status: 500 })
    }

    const contentType = request.headers.get('content-type') ?? ''
    let file: File | null = null
    let name = 'uploaded-image'
    let mimeType = 'image/png'

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      file = formData.get('file') as File | null
      const uploadedName = formData.get('name')
      const uploadedMimeType = formData.get('mimeType')

      if (uploadedName && typeof uploadedName === 'string') {
        name = uploadedName
      }

      if (uploadedMimeType && typeof uploadedMimeType === 'string') {
        mimeType = uploadedMimeType
      }
    } else {
      const body = await request.json()
      const { source, name: bodyName, mimeType: bodyMimeType } = body ?? {}

      if (!source || typeof source !== 'string') {
        return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
      }

      if (bodyName && typeof bodyName === 'string') {
        name = bodyName
      }

      if (bodyMimeType && typeof bodyMimeType === 'string') {
        mimeType = bodyMimeType
      }

      if (!source.startsWith('/uploads/')) {
        return NextResponse.json({ error: 'Expected a public uploaded file URL.' }, { status: 400 })
      }

      file = null
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPG, JPEG, and GIF files are allowed.' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    await fs.mkdir(uploadDir, { recursive: true })

    const fileExt = path.extname(file.name || 'image.png') || '.png'
    const finalFileName = `${randomUUID()}${fileExt}`
    const uploadPath = path.join(uploadDir, finalFileName)
    const arrayBuffer = await file.arrayBuffer()
    await fs.writeFile(uploadPath, Buffer.from(arrayBuffer))

    const imageUrl = getUploadUrl(finalFileName)

    const client = new Client({
      connectionString: mediaDbUrl,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()

    const tableQuery = `
      CREATE TABLE IF NOT EXISTS media_assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        mime_type VARCHAR(100),
        source TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await client.query(tableQuery)

    const insertQuery = `
      INSERT INTO media_assets (name, mime_type, source)
      VALUES ($1, $2, $3)
      RETURNING id, name, mime_type, source, created_at
    `

    const result = await client.query(insertQuery, [name || 'uploaded-image', mimeType || 'image/png', imageUrl])
    await client.end()

    return NextResponse.json({
      ok: true,
      url: imageUrl,
      item: result.rows[0],
    })
  } catch (error) {
    console.error('MEDIA_DB save failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save media.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    if (!mediaDbUrl) {
      return NextResponse.json({ error: 'MEDIA_DB is not configured.' }, { status: 500 })
    }

    const client = new Client({
      connectionString: mediaDbUrl,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()

    const createTable = `
      CREATE TABLE IF NOT EXISTS media_assets (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        mime_type VARCHAR(100),
        source TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `

    await client.query(createTable)

    const result = await client.query('SELECT id, name, mime_type, source, created_at FROM media_assets ORDER BY created_at DESC LIMIT 20')
    await client.end()

    return NextResponse.json({ items: result.rows })
  } catch (error) {
    console.error('MEDIA_DB read failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch media.' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!mediaDbUrl) {
      return NextResponse.json({ error: 'MEDIA_DB is not configured.' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const id = typeof body?.id === 'number' ? body.id : Number(body?.id)
    const source = typeof body?.source === 'string' ? body.source : null

    if ((!Number.isFinite(id) || id <= 0) && !source) {
      return NextResponse.json({ error: 'Media id or source is required.' }, { status: 400 })
    }

    const client = new Client({
      connectionString: mediaDbUrl,
      ssl: { rejectUnauthorized: false },
    })

    await client.connect()

    const deleteQuery = source
      ? 'DELETE FROM media_assets WHERE source = $1 RETURNING id, source, name'
      : 'DELETE FROM media_assets WHERE id = $1 RETURNING id, source, name'

    const values = source ? [source] : [id]
    const result = await client.query(deleteQuery, values)
    await client.end()

    if (!result.rowCount) {
      return NextResponse.json({ error: 'Media item not found.' }, { status: 404 })
    }

    const deletedSource = result.rows[0]?.source
    if (deletedSource) {
      const filePath = path.join(process.cwd(), 'public', deletedSource.replace(/^\/+/, ''))
      try {
        await fs.unlink(filePath)
      } catch {
        // Ignore missing file cleanup errors.
      }
    }

    return NextResponse.json({ ok: true, deleted: result.rowCount })
  } catch (error) {
    console.error('MEDIA_DB delete failed:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete media.' }, { status: 500 })
  }
}

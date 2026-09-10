import type { ReactNode } from 'react'

const URL_PATTERN = /https?:\/\/[^\s<]+/gi
const TRAILING_PUNCTUATION = /[.,!?;:)}\]]+$/

interface MessageBodyProps {
  body: string
}

export default function MessageBody({ body }: MessageBodyProps) {
  const content: ReactNode[] = []
  let lastIndex = 0

  for (const match of body.matchAll(URL_PATTERN)) {
    const rawUrl = match[0]
    const start = match.index ?? 0
    const url = rawUrl.replace(TRAILING_PUNCTUATION, '')
    const trailingText = rawUrl.slice(url.length)

    if (start > lastIndex) content.push(body.slice(lastIndex, start))
    content.push(
      <a
        key={`${start}-${url}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-2 hover:opacity-80"
      >
        {url}
      </a>,
    )
    if (trailingText) content.push(trailingText)
    lastIndex = start + rawUrl.length
  }

  if (lastIndex < body.length) content.push(body.slice(lastIndex))
  return content
}

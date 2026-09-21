interface BotDetectionResult {
  isBot: boolean
  score: number
  reasons: string[]
  confidence: 'low' | 'medium' | 'high'
}

export class BotDetectionService {
  private readonly socialMediaPatterns: RegExp[] = [
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegram/i,
    /slack/i,
    /discord/i,
    /pinterestbot/i,
    /vkshare/i,
    /redditbot/i,
    /quora link preview/i,
  ]

  async detect(
    userAgent: string,
    _ip?: string,
    _headers?: Record<string, string | null>,
  ): Promise<BotDetectionResult> {
    const normalizedUserAgent = userAgent.toLowerCase()
    const reasons: string[] = []

    for (const pattern of this.socialMediaPatterns) {
      if (pattern.test(normalizedUserAgent)) {
        reasons.push('Social media preview bot detected')
        return {
          isBot: true,
          score: 100,
          reasons,
          confidence: 'high',
        }
      }
    }

    return {
      isBot: false,
      score: 0,
      reasons: [],
      confidence: 'low',
    }
  }
}
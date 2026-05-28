import crypto from 'crypto'

// Returns true if the X-Hub-Signature-256 header matches
export function verifySignature(rawBody, signature) {
  if (!signature) return false

  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.APP_SECRET)
    .update(rawBody)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  )
}

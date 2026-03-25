import { prisma } from '@/lib/prisma'
import { substituteTokens, TokenContext } from './tokens'

export async function getTemplate(templateId: string) {
  return prisma.emailTemplate.findUnique({ where: { id: templateId } })
}

export async function renderTemplate(
  templateId: string,
  context: TokenContext,
  signatureHtml?: string
): Promise<{ subject: string; html: string }> {
  const template = await getTemplate(templateId)
  if (!template) throw new Error(`Template ${templateId} not found`)

  let html = substituteTokens(template.htmlBody, context)
  const subject = substituteTokens(template.subject, context)

  if (signatureHtml) {
    html = appendSignature(html, signatureHtml)
  }

  return { subject, html }
}

export function appendSignature(html: string, signatureHtml: string): string {
  // Append signature before closing body tag if present, otherwise append at end
  if (html.toLowerCase().includes('</body>')) {
    return html.replace(/<\/body>/i, `${signatureHtml}</body>`)
  }
  return `${html}<div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">${signatureHtml}</div>`
}

export async function getDefaultSignature(groupId?: string) {
  if (groupId) {
    const groupSig = await prisma.emailSignature.findFirst({
      where: { groupId, isDefault: true },
    })
    if (groupSig) return groupSig
  }
  return prisma.emailSignature.findFirst({ where: { isDefault: true } })
}

import { prisma } from '@/lib/prisma'
import { generateUnsubscribeToken } from '@/lib/email/tokens'

interface Props {
  params: { groupId: string; userId: string; token: string }
}

export default async function UnsubscribePage({ params }: Props) {
  const { groupId, userId, token } = params

  const expectedToken = generateUnsubscribeToken(userId, groupId)
  const isValidToken = token === expectedToken

  let success = false
  let error = ''

  if (isValidToken) {
    try {
      await prisma.groupMembership.updateMany({
        where: { userId, groupId, unsubscribedAt: null },
        data: { unsubscribedAt: new Date() },
      })
      success = true
    } catch {
      error = 'Failed to process unsubscribe request. Please try again.'
    }
  } else {
    error = 'Invalid or expired unsubscribe link.'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center bg-blue-50">
            {success ? (
              <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {success ? 'Unsubscribed' : 'Error'}
          </h1>

          {success ? (
            <>
              <p className="text-gray-600 mb-6">
                You have been successfully unsubscribed from group email communications. You will no longer
                receive bulk emails from this group.
              </p>
              <p className="text-sm text-gray-500">
                You can re-subscribe at any time through the member portal or by contacting us.
              </p>
            </>
          ) : (
            <p className="text-red-600">{error}</p>
          )}

          <div className="mt-8">
            <a
              href="/"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Return to home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

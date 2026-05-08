import React from 'react'

export default function WelcomeScreen({
  onSignIn,
  onSignUp,
  onGuest,
  configured,
  inviteOrgName,
}) {
  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-emerald-700 mb-2">🎾 Tennis Organizer</h1>
        <p className="text-gray-500 mb-6 text-sm">
          Run tournaments, leagues, and socials for your club.
        </p>

        {inviteOrgName && (
          <div className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm text-emerald-900">
              <strong>{inviteOrgName}</strong> invited you to join.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Sign in or create an account to accept.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {configured ? (
            <>
              <button
                onClick={onSignIn}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Sign in
              </button>
              {inviteOrgName && (
                <button
                  onClick={onSignUp}
                  className="w-full py-3 bg-white text-emerald-700 border-2 border-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
                >
                  Accept invite — create account
                </button>
              )}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-gray-400">or</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
              Auth is not configured. Continue as a guest to use the
              quick-start tournament flow.
            </p>
          )}
          <button
            onClick={onGuest}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Continue as guest
          </button>
        </div>

        {configured && !inviteOrgName && (
          <p className="text-xs text-gray-400 text-center mt-6">
            Sign-up is by invitation. Ask your club organizer for a
            link.
          </p>
        )}
      </div>
    </div>
  )
}

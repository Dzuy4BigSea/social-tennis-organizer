import React, { useState } from 'react'
import { useAuth } from '../../store/useAuth.js'

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export default function OrgBootstrap() {
  const { user, createOrg, signOut } = useAuth()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const effectiveSlug = slugTouched ? slug : slugify(name)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !effectiveSlug) return
    setError(null)
    setSubmitting(true)
    try {
      await createOrg(name.trim(), effectiveSlug)
    } catch (err) {
      setError(err.message ?? 'Could not create org')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-emerald-700 flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full space-y-4"
      >
        <h2 className="text-2xl font-bold text-emerald-700">
          Create your club
        </h2>
        <p className="text-sm text-gray-500">
          You're not in any club yet. Set one up — you'll be its
          owner. You can invite players in once it's created.
        </p>
        <label className="block">
          <span className="text-sm text-gray-700">Club name</span>
          <input
            type="text"
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Lakeside Tennis Club"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">URL slug</span>
          <input
            type="text"
            required
            maxLength={40}
            value={effectiveSlug}
            onChange={(e) => {
              setSlug(slugify(e.target.value))
              setSlugTouched(true)
            }}
            placeholder="lakeside-tennis-club"
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
          />
          <span className="text-xs text-gray-400 mt-1 block">
            Lowercase letters, numbers, and dashes. Used in URLs.
          </span>
        </label>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !name.trim() || !effectiveSlug}
          className="w-full py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create club'}
        </button>
        <p className="text-xs text-center text-gray-400">
          Signed in as {user?.email}.{' '}
          <button
            type="button"
            onClick={signOut}
            className="hover:underline"
          >
            Sign out
          </button>
        </p>
      </form>
    </div>
  )
}

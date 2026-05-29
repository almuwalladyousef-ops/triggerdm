export default function MetaCallback({ searchParams }) {
  const query = new URLSearchParams(searchParams || {}).toString()
  const localUrl = `http://127.0.0.1:8787/callback${query ? `?${query}` : ''}`

  return (
    <html>
      <head>
        <meta httpEquiv="refresh" content={`0;url=${localUrl}`} />
      </head>
      <body style={{ fontFamily: 'sans-serif', padding: 24 }}>
        <h1>Returning to local setup...</h1>
        <p>If you are not redirected automatically, open this link:</p>
        <p><a href={localUrl}>{localUrl}</a></p>
      </body>
    </html>
  )
}

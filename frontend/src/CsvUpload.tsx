import { useState } from 'react'

type CsvUploadProps = {
  month: string
}

function CsvUpload({ month }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [csvText, setCsvText] = useState('') // remember any file contents
  const [isReading, setIsReading] = useState(false) // if reading is in progress, disable the file input
  const [error, setError] = useState('') // remember any error message

  const selectedMonth = month
    ? new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`))
    : 'No month selected'

  const readFile = async () => {
    if (!file) {
      return
    }

    setError('')
    setCsvText('')

    setIsReading(true)
    try {
      const text = await file.text()
      setCsvText(text)
    } catch {
      setError('We couldn\'t read this file. Please select it again.')
    } finally {
      setIsReading(false)
    }
  }

  return (
    <div>
      <p className="help-text">
        Selected month: <strong>{selectedMonth}</strong>
      </p>

      <div className="field">
        <label htmlFor="spending-csv">Choose a CSV file</label>
        <input
          id="spending-csv"
          type="file"
          accept=".csv"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null
            setFile(selectedFile)
            setCsvText('')
            setError('')
          }}
          disabled={isReading}
        />
      </div>

      {file && (
        <p role="status">
          Selected file: <strong>{file.name}</strong>
        </p>
      )}

      <p className="help-text">
        Your file has not been uploaded or saved.
      </p>

      <button
        type="button"
        onClick={readFile}
        disabled={!file || isReading}
      >
        {isReading ? 'Reading file...' : 'Read file'}
      </button>

      {error && <p role="alert">{error}</p>}

      {csvText && (
        <section aria-labelledby="csv-preview-heading">
          <h3 id="csv-preview-heading">CSV file contents</h3>
          <pre className="csv-preview">{csvText}</pre>
        </section>
      )}
    </div>
  )
}

export default CsvUpload

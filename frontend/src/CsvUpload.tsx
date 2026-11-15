import { useState } from 'react'

type CsvUploadProps = {
  month: string
}

function CsvUpload({ month }: CsvUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const selectedMonth = month
    ? new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${month}-01T00:00:00Z`))
    : 'No month selected'

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
          }}
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
    </div>
  )
}

export default CsvUpload

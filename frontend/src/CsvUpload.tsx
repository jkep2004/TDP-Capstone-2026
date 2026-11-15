type CsvUploadProps = {
  month: string
}

function CsvUpload({ month }: CsvUploadProps) {
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
      <p>CSV import is not implemented yet.</p>
    </div>
  )
}

export default CsvUpload

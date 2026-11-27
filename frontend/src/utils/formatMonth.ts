const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long', year: 'numeric', timeZone: 'UTC',
})

export const formatMonth = (month: string) => monthName.format(new Date(`${month}-01T00:00:00Z`))

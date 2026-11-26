const pounds = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const emissions = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 })

export const formatMoney = (amount: number) => Number.isFinite(amount) ? pounds.format(amount) : 'Unavailable'
export const formatCarbonNumber = (amount: number) => emissions.format(amount)
export const formatCarbon = (amount: number) => Number.isFinite(amount) ? `${formatCarbonNumber(amount)} kg CO₂e` : 'Estimate unavailable'

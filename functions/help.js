function generateBottomTitles(rows) {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let titles = {};
    rows.forEach((row, index) => {
        const date = new Date(row.fecha);
        const month = date.getMonth();
        titles[index] = monthNames[month];
    });
    return titles;
}

module.exports = { generateBottomTitles };
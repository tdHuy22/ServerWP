const loadIndex = async (req, res) => {
    try {
        res.render('index');
    } catch (err) {
        console.error(err);
    }
}

const loadScreen = async (req, res) => {
    try {
        res.render('screen');
    } catch (err) {
        console.error(err)
    }
}

module.exports = {
    loadIndex
}
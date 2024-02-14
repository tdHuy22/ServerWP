const loadIndex = async (req, res) => {
    try{
        res.render('index');
    }catch(err){
        console.error(err)
    }
}

module.exports = {
    loadIndex
}
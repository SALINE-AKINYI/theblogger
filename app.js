//In commonJS : const app = require('./index.js');
import app from './index.js'; //In module

app.listen(app.get('port'), ()=>{
    console.log(`Server running at port ${app.get('port')}`)
})
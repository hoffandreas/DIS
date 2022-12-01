const express = require('express');

const app = express();
 
app.get('/', (req, res) => {
    res.send('Hi Hoff and this is edited');
});

app.listen(3000, () => {
    console.log('App listening on port http://localhost:3000');
});

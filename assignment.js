require('dotenv').config();
console.log({
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME
  });
  

const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

function getDistance(lat1,lng1,lat2,lng2){
  const toRad = x => x * Math.PI / 180;
  const R = 6371;                               // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.post('/addSchool',async function(req,res){
    const {name,address,latitude,longitude} = req.body;

    if(! name || ! address || latitude == null || longitude == null){
        return res.status(400).json({
            error : "All fields are required to be filled"
        });
    } 

    if(typeof name !== 'string' || typeof(address) !== 'string'){
            return res.status(400).json({
                error : " Name and Address must be String"
            })
     }

    if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                 error: 'Latitude and longitude must be numbers' 
                });
    }
        
    try{
        const sql = 'INSERT INTO schools (name,address,latitude,longitude) VALUES(?,?,?,?)' ;
        res.status(201).json({ message: "School added successfully!" });

        const [result] = await pool.execute(sql,[name,address,latitude,longitude]);
    }
    catch(err){
        console.error(err);
        res.status(500).json({ error: 'Database error.' });
    }
})

app.get('/listSchools',async function(req,res){
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if(isNaN(lat) || isNaN(lng)){
        return res.status(400).json({
            msg : "Invalid or missing latitude/longitude query parameters"
        })
    }

    try{
        const [rows] = await pool.query('SELECT id, name, address, latitude, longitude FROM schools');

        const schoolDist = rows.map(s => {
            const dist = getDistance(lat,lng,s.latitude,s.longitude);
            return { ...s,distance : dist};
        });
     
    schoolDist.sort((a,b) => a.distance - b.distance);

    res.json(schoolDist);
    }
    catch(err){
        console.log(err);
        res.status(500).json({error : "Database error"}
        )}
});

const PORT = process.env.PORT || 3000 ;
app.listen(PORT , function(){
    console.log(`Server is running on port ${PORT}`);
})
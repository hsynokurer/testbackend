const express = require('express')
const app = express()
const mongoose = require('mongoose');
const fs = require('fs');
const States = require('./models/States');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');

// Use the body-parser middleware to parse incoming request bodies
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Load states data from JSON file
const whitelist = ['https://www.google.com', 'http://localhost:3000', 'https://dazzling-snickerdoodle-777101.netlify.app']
const corsOptions = {
    origin: (origin, callback) => {
        if (whitelist.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionSuccessStatus: 00
}
app.use(cors(corsOptions));
// Connect to MongoDB database

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://alinail13ank:Reset123@cluster0.2h2iqyk.mongodb.net/test";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const stateAbbreviations = {
    "AL": "ALABAMA",
    "AK": "ALASKA",
    "AZ": "ARIZONA",
    "AR": "ARKANSAS",
    "CA": "CALIFORNIA",
    "CO": "COLORADO",
    "CT": "CONNECTICUT",
    "DE": "DELAWARE",
    "FL": "FLORIDA",
    "GA": "GEORGIA",
    "HI": "HAWAII",
    "ID": "IDAHO",
    "IL": "ILLINOIS",
    "IN": "INDIANA",
    "IA": "IOWA",
    "KS": "KANSAS",
    "KY": "KENTUCKY",
    "LA": "LOUISIANA",
    "ME": "MAINE",
    "MD": "MARYLAND",
    "MA": "MASSACHUSETTS",
    "MI": "MICHIGAN",
    "MN": "MINNESOTA",
    "MS": "MISSISSIPPI",
    "MO": "MISSOURI",
    "MT": "MONTANA",
    "NE": "NEBRASKA",
    "NV": "NEVADA",
    "NH": "NEW HAMPSHIRE",
    "NJ": "NEW JERSEY",
    "NM": "NEW MEXICO",
    "NY": "NEW YORK",
    "NC": "NORTH CAROLINA",
    "ND": "NORTH DAKOTA",
    "OH": "OHIO",
    "OK": "OKLAHOMA",
    "OR": "OREGON",
    "PA": "PENNSYLVANIA",
    "RI": "RHODE ISLAND",
    "SC": "SOUTH CAROLINA",
    "SD": "SOUTH DAKOTA",
    "TN": "TENNESSEE",
    "TX": "TEXAS",
    "UT": "UTAH",
    "VT": "VERMONT",
    "VA": "VIRGINIA",
    "WA": "WASHINGTON",
    "WV": "WEST VIRGINIA",
    "WI": "WISCONSIN",
    "WY": "WYOMING"

};


let statesWithFunFacts;
let states;
async function getStatesWithFunFacts() {
    connectToDB();
    const statesData = require('./statesData.json');
    const stateCodes = statesData.map((state) => state.code);

    const dbStates = await Promise.all(
        stateCodes.map((stateCode) => States.findOne({ stateCode }, null, { maxTimeMS: 30000 }))
    );
    statesWithFunFacts = statesData.map((state, index) => {
        const dbState = dbStates[index];
        const funFacts = dbState ? dbState.funfacts : [];
        return funFacts.length > 0 ? { ...state, funfacts: funFacts } : state;
    });
}

async function run() {
    await getStatesWithFunFacts();
}
run().catch(console.dir);



app.get('/', cors(), (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/states/', async (req, res) => {
    try {
        const path = req.path;
        let filteredArray;

        if (path === '/states/') {

            filteredArray = statesWithFunFacts;

            if (path === '/states/' && req.query.contig === 'true') {
                filteredArray = filteredArray.filter(state => state.code !== 'AK' && state.code !== 'HI');
            } else if (path === '/states/' && req.query.contig === 'false') {
                filteredArray = filteredArray.filter(state => state.code === 'AK' || state.code === 'HI');
            }
        } else {
            res.status(404).send('Page not found');
            return;
        }

        const formattedData = JSON.stringify(filteredArray, null, 2);
        res.set('Content-Type', 'application/json');
        res.send(formattedData);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});


app.get('/states/:state', async (req, res) => {
    let filteredArray
    const stateCode = req.params.state.toUpperCase();
    if ((stateCode in stateAbbreviations)) {
        filteredArray = await statesWithFunFacts.find(state => state.code === stateCode);
        if (filteredArray) {
            const formattedData = JSON.stringify(filteredArray, null, 2);
            res.set('Content-Type', 'application/json');
            res.send(formattedData);
        } else {
            res.status(404).send('State not found');
        }
    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('/states/:state/funfact', async (req, res) => {
    const list = statesWithFunFacts;
    const stateCode = req.params.state.toUpperCase();
    const stateData = await list.find(state => state.code === stateCode);
    if (stateData) {
        if ('funfacts' in stateData) {

            if (stateData.funfacts.length > 0) {
                const formattedData = stateData.funfacts[Math.floor(Math.random() * stateData.funfacts.length)];
                const response = { funfact: formattedData };
                res.set('Content-Type', 'application/json');
                res.send(response);

            }
        }
        else {
            res.status(404).json({ message: 'No Fun Facts found for ' + stateData.state });

        }

    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }

});

//POSTs
app.post('/states/:state/funfact', async (req, res) => {
    try {
        const stateCode = req.params.state.toUpperCase();
        const newFunFacts = req.body.funfacts;
        if (!newFunFacts) {
            res.status(400).send({ message: 'State fun facts value required' });
            return;
        }
        if (!Array.isArray(newFunFacts)) {
            res.status(400).send({ message: 'State fun facts value must be an array' });
            return;
        }

        // Find the state in the database
        let stateData = await States.findOne({ stateCode });

        if (!stateData) {
            stateData = new States({ stateCode: stateCode, funfacts: newFunFacts });
        }

        // Add the new fun facts to the existing array
        stateData.funfacts.push(...newFunFacts);

        // Save the updated state document to the database
        stateData = await stateData.save();

        // Return the updated or new state document as the response
        await getStatesWithFunFacts();
        res.status(200).send(stateData);

    } catch (err) {
        console.error(err);
        res.status(500).send({ error: 'Internal Server Error' });
    }
});

app.patch('/states/:state/funfact', async (req, res) => {
    try {
        const stateCode = req.params.state.toUpperCase();
        const funfact = req.body.funfact;
        const index = req.body.index;


        if (!funfact) {
            res.status(400).send({ message: 'State fun fact value required' });
            return;
        }
        if (!index) {
            res.status(400).send({ message: 'State fun fact index value required' });
            return;
        }
        if (!statesWithFunFacts) {
            await getStatesWithFunFacts();
        }
        const list = statesWithFunFacts;

        const stateInfo = await list.find(state => state.code === stateCode);
        if (stateInfo) {

            const zeroBasedIndex = index - 1;
            const stateData = await States.findOne({ stateCode });
            if (stateData) {
                if ('funfacts' in stateData) {
                    if (stateData.funfacts.length > 0) {
                        // Replace the existing fun fact with the new one at the specified index
                        const funfacts = stateData.funfacts;
                        if (zeroBasedIndex >= 0 && zeroBasedIndex < funfacts.length) {
                            funfacts[zeroBasedIndex] = funfact;
                        } else {
                            return res.status(400).send({ message: 'No Fun Fact found at that index for ' + stateInfo.state });
                        }

                        // Save the updated state document to the database
                        const updatedState = await stateData.save();

                        // Return the updated state document as the response
                        await getStatesWithFunFacts();
                        res.send(updatedState);

                        return;
                    }
                }

            }
            else {
                res.status(400).json({ message: 'No Fun Facts found for ' + stateInfo.state });
            }

        }
        else {
            res.status(404).json({ "message": "Invalid state abbreviation parameter" });
        }


    } catch (err) {
        res.status(500).send(err);
    }
});

app.delete('/states/:state/funfact', cors(), async (req, res) => {
    const stateCode = req.params.state.toUpperCase();
    const index = req.body.index;
    const list = statesWithFunFacts;

    if (!index) {
        res.status(400).send({ message: 'State fun fact index value required' });
        return;
    }
    const stateInfo = await list.find(state => state.code === stateCode);

    if (stateInfo) {

        const zeroBasedIndex = index - 1;
        const stateData = await States.findOne({ stateCode });
        if (stateData) {
            if ('funfacts' in stateData) {
                if (zeroBasedIndex < stateData.funfacts.length) {
                    stateData.funfacts.splice(zeroBasedIndex, 1);
                    const updatedState = await stateData.save();
                    res.status(200).send(updatedState);
                }
                else {
                    return res.status(400).json({ message: 'No Fun Fact found at that index for ' + stateInfo.state });

                }
            }
        } else {
            res.status(400).json({ message: 'No Fun Facts found for ' + stateInfo.state });
        }

    }
    else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('/states/:state/capital', cors(), async (req, res) => {

    let filteredArray
    const stateCode = req.params.state.toUpperCase();
    let state = await statesWithFunFacts.find(state => state.code === stateCode);

    if (state) {
        const formattedData = JSON.stringify({
            state: state.state,
            capital: state.capital_city
        }, null);
        res.set('Content-Type', 'application/json');
        res.send(formattedData);

    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('/states/:state/nickname', cors(), async (req, res) => {

    let filteredArray
    const stateCode = req.params.state.toUpperCase();
    let state = await statesWithFunFacts.find(state => state.code === stateCode);

    if (state) {
        const formattedData = JSON.stringify({
            state: state.state,
            nickname: state.nickname
        }, null);
        res.set('Content-Type', 'application/json');
        res.send(formattedData);

    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('/states/:state/population', cors(), async (req, res) => {

    let filteredArray
    const stateCode = req.params.state.toUpperCase();
    let state = await statesWithFunFacts.find(state => state.code === stateCode);

    if (state) {
        const formattedData = JSON.stringify({
            state: state.state,
            population: state.population.toLocaleString()
        }, null);
        res.set('Content-Type', 'application/json');
        res.send(formattedData);

    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('/states/:state/admission', async (req, res) => {
    let filteredArray
    const stateCode = req.params.state.toUpperCase();
    let state = await statesWithFunFacts.find(state => state.code === stateCode);

    if (state) {
        const formattedData = JSON.stringify({
            state: state.state,
            admitted: state.admission_date
        }, null);
        res.set('Content-Type', 'application/json');
        res.send(formattedData);

    } else {
        res.status(404).json({ "message": "Invalid state abbreviation parameter" });
    }
});

app.get('*', cors(), (req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});



async function connectToDB() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
    } catch (err) {
        console.error(err);
    }
}
async function disconnectToDB() {
    try {
        setTimeout(() => { client.close() }, 1500)
        await client.close();
        console.info('Disconnected from MongoDB');

    }
    catch (err) {
        console.error(err);
    }
}



app.listen(3000);
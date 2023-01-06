const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');

app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { application } = require('express');




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzhzyda.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
    // console.log('inside function', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('unauthrized access');
    }
    const token = authHeader.splitZ(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {

        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const appointmentOptionCollection = client.db('Doctors-Portal').collection('appointmentOptions');
        const bookingsCollection = client.db('Doctors-Portal').collection('bookingsCollection');
        const userCollection = client.db('Doctors-Portal').collection('userCollection');



        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();
            const bookingQuery = { selectedDate: date }
            const booked = await bookingsCollection.find(bookingQuery).toArray();
            options.forEach(option => {
                const optionBooked = booked.filter(book => book.treatment === option.name)
                const bookedSlots = optionBooked.map(book => book.slot)
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                // console.log(bookedSlots, date, option.name, remainingSlots.length)
                option.slots = remainingSlots;

            })
            res.send(options);
        });



        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                email: booking.email,
                selectedDate: booking.selectedDate,
                treatment: booking.treatment
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You have booking on ${booking.treatment} ${booking.selectedDate}`
                return res.send({ acknowledged: false, message: message })
            }
            const result = await bookingsCollection.insertOne(booking);
            res.send(result);
        });


        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            // console.log(user);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' })

        })



        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            const query = { email: email };
            const bookings = await bookingsCollection.find(query).toArray();
            res.send(bookings);
        });


        // app.get('/bookings', async (req, res) => {
        //     const email = req.query.email;
        //     // const decodedEmail = req.decoded.email;
        //     // if (email !== decodedEmail) {
        //     //     return res.status(403).send({ message: 'forbidden access' });
        //     // }
        //     const query = { email: email };
        //     const bookings = await bookingsCollection.find(query).toArray();
        //     res.send(bookings);
        // });



        app.get('/users', async (req, res) => {
            const query = {};
            const users = await userCollection.find(query).toArray();
            res.send(users);
        })


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        app.put('/users/:id', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail };
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'forbidden access' });
            }


            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };

            const updatadDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatadDoc, options);
            res.send(result);
        })




    }
    finally {

    }

}
run().catch(console.log);


app.get('/', async (req, res) => {
    res.send('doctors portal server is running')
})

app.listen(port, () => console.log(`Doctors portal running on ${port}`));
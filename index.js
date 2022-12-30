const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const app = express();
require('dotenv').config();

app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion } = require('mongodb');




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dzhzyda.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        const appointmentOptionCollection = client.db('Doctors-Portal').collection('appointmentOptions');
        const bookingsCollection = client.db('Doctors-Portal').collection('bookingsCollection');



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
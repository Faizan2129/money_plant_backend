import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { db, execQuery, beginTransaction, commitTransaction, rollbackTransaction } from './db/db.js';
import { LoginAppCtrl, createUserCtrl } from './app/controller/authenticationController.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, GET, DELETE');
        return res.status(200).json({});
    }
    next();
});

// Authentication routes
app.post("/money_plant/login", LoginAppCtrl);
app.post("/money_plant/register", createUserCtrl);


app.post('/contact', (req, res) => {
    const { name, email, message } = req.body;
    const sql = 'INSERT INTO ContactUs (name, email_id, message) VALUES (?, ?, ?)';
    db.query(sql, [name, email, message], (err, result) => {
        if (err) {
            console.error('Error inserting into ContactUs table:', err);
            res.status(500).json({ status: 500, message: 'Failed to insert into ContactUs table' });
            return;
        }
        console.log('Inserted into ContactUs table:', result);
        res.status(200).json({ status: 200, message: 'Contact details inserted successfully' });
    });
});

// GET endpoint to fetch all contacts
app.get('/contacts', (req, res) => {
    const sql = 'SELECT * FROM ContactUs';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching from ContactUs table:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch from ContactUs table' });
            return;
        }
        console.log('Fetched from ContactUs table:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

// GET endpoint to fetch dashboard data by user_id
app.get('/dashboard/:user_id', (req, res) => {
    const userId = req.params.user_id;  // Get the user_id from the URL parameters

    const sql = `
        SELECT 
            SUM(CASE WHEN DATE(transaction_date) = CURDATE() THEN amount ELSE 0 END) AS daily_total,
            SUM(CASE WHEN YEARWEEK(transaction_date, 1) = YEARWEEK(CURDATE(), 1) THEN amount ELSE 0 END) AS weekly_total,
            SUM(CASE WHEN MONTH(transaction_date) = MONTH(CURDATE()) AND YEAR(transaction_date) = YEAR(CURDATE()) THEN amount ELSE 0 END) AS monthly_total,
            SUM(CASE WHEN YEAR(transaction_date) = YEAR(CURDATE()) THEN amount ELSE 0 END) AS yearly_total
        FROM MoneySpending
        WHERE user_id = ?;
    `;
    
    db.query(sql, [userId], (err, result) => {
        if (err) {
            console.error('Error fetching dashboard data:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch dashboard data' });
            return;
        }

        res.status(200).json({
            status: 200,
            data: {
                daily: result[0].daily_total,
                weekly: result[0].weekly_total,
                monthly: result[0].monthly_total,
                yearly: result[0].yearly_total
            }
        });
    });
});


// GET endpoint to fetch spending data for pie chart by user_id
app.get('/spending-pie-chart/:user_id', (req, res) => {
    const userId = req.params.user_id;  // Get the user_id from the URL parameters

    const sql = `
        SELECT category, SUM(amount) AS total_spent
        FROM MoneySpending
        WHERE user_id = ?
        GROUP BY category;
    `;
    
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching spending pie chart data:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch pie chart data' });
            return;
        }
        console.log('Fetched spending data for pie chart:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

// GET endpoint to fetch all spending records
app.get('/track-records', (req, res) => {
    const sql = 'SELECT * FROM MoneySpending ORDER BY transaction_date DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching track records:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch track records' });
            return;
        }
        console.log('Fetched track records:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

// GET endpoint to fetch a spending record by ID
app.get('/track-records/:id', (req, res) => {
    const recordId = req.params.id;
    const sql = 'SELECT * FROM MoneySpending WHERE user_id = ?';
    
    db.query(sql, [recordId], (err, results) => {
        if (err) {
            console.error('Error fetching track record by ID:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch track record' });
            return;
        }

        if (results.length === 0) {
            // No record found with the given ID
            res.status(404).json({ status: 404, message: 'Record not found' });
            return;
        }

        console.log('Fetched track record by ID:', results);
        res.status(200).json({ status: 200, data: results});  // Return the single record
    });
});

// POST endpoint to create a new spending record
app.post('/track-records', (req, res) => {
    const { amount, category, description, payment_method,user_id } = req.body;

    // Validate the request body
    if (!amount || !category || !payment_method) {
        return res.status(400).json({ status: 400, message: 'Missing required fields.' });
    }

    const sql = 'INSERT INTO MoneySpending (amount, category, description, payment_method,user_id) VALUES (?, ?, ?, ?,?)';
    console.log(sql)
    db.query(sql, [amount, category, description, payment_method,user_id], (err, result) => {
        if (err) {
            console.error('Error inserting record:', err);
            return res.status(500).json({ status: 500, message: 'Failed to insert record' });
        }
        console.log('Inserted record:', result);
        res.status(201).json({ status: 201, message: 'Record added successfully', data: result });
    });
});

// PUT endpoint to update a spending record
app.put('/track-records/:id', (req, res) => {
    const { id } = req.params;
    const { amount, category, description, payment_method } = req.body;

    // Validate the request body
    if (!amount || !category || !payment_method) {
        return res.status(400).json({ status: 400, message: 'Missing required fields.' });
    }

    const sql = 'UPDATE MoneySpending SET amount = ?, category = ?, description = ?, payment_method = ? WHERE id = ?';
    db.query(sql, [amount, category, description, payment_method, id], (err, result) => {
        if (err) {
            console.error('Error updating record:', err);
            return res.status(500).json({ status: 500, message: 'Failed to update record' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: 'Record not found' });
        }
        console.log('Updated record:', result);
        res.status(200).json({ status: 200, message: 'Record updated successfully' });
    });
});
// DELETE endpoint to remove a spending record
app.delete('/track-records/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM MoneySpending WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting record:', err);
            return res.status(500).json({ status: 500, message: 'Failed to delete record' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: 'Record not found' });
        }
        console.log('Deleted record:', result);
        res.status(200).json({ status: 200, message: 'Record deleted successfully' });
    });
});
// GET endpoint to fetch all goal records
app.get('/goals', (req, res) => {
    const sql = 'SELECT * FROM goals ORDER BY created_date DESC';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching goal records:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch goal records' });
            return;
        }
        console.log('Fetched goal records:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

// GET endpoint to fetch goal records by user_id
app.get('/goals/:user_id', (req, res) => {
    const { user_id } = req.params; // Get user_id from the URL parameters
    const sql = 'SELECT * FROM goals WHERE created_by = ? ORDER BY created_date DESC';
    
    db.query(sql, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching goal records:', err);
            res.status(500).json({ status: 500, message: 'Failed to fetch goal records' });
            return;
        }
        console.log('Fetched goal records:', results);
        res.status(200).json({ status: 200, data: results });
    });
});

// POST endpoint to create a new goal
app.post('/goals', (req, res) => {
    const { goal_amount, created_by } = req.body;

    // Validate the request body
    if (!goal_amount || !created_by) {
        return res.status(400).json({ status: 400, message: 'Missing required fields.' });
    }

    const sql = 'INSERT INTO goals (goal_amount, created_by) VALUES (?, ?)';
    db.query(sql, [goal_amount, created_by], (err, result) => {
        if (err) {
            console.error('Error inserting goal:', err);
            return res.status(500).json({ status: 500, message: 'Failed to insert goal' });
        }
        console.log('Inserted goal:', result);
        res.status(201).json({ status: 201, message: 'Goal added successfully', data: result });
    });
});
// PUT endpoint to update an existing goal
app.put('/goals/:id', (req, res) => {
    const { id } = req.params;
    const { goal_amount, created_by } = req.body;

    // Validate the request body
    if (!goal_amount || !created_by) {
        return res.status(400).json({ status: 400, message: 'Missing required fields.' });
    }

    const sql = 'UPDATE goals SET goal_amount = ?, created_by = ? WHERE id = ?';
    db.query(sql, [goal_amount, created_by, id], (err, result) => {
        if (err) {
            console.error('Error updating goal:', err);
            return res.status(500).json({ status: 500, message: 'Failed to update goal' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: 'Goal not found' });
        }
        console.log('Updated goal:', result);
        res.status(200).json({ status: 200, message: 'Goal updated successfully' });
    });
});
// DELETE endpoint to remove a goal
app.delete('/goals/:id', (req, res) => {
    const { id } = req.params;

    const sql = 'DELETE FROM goals WHERE id = ?';
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error deleting goal:', err);
            return res.status(500).json({ status: 500, message: 'Failed to delete goal' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ status: 404, message: 'Goal not found' });
        }
        console.log('Deleted goal:', result);
        res.status(200).json({ status: 200, message: 'Goal deleted successfully' });
    });
});


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

import { loginMdl, createUserMdl } from '../models/authenticationModel.js';
import express from "express";
import Jwt from 'jsonwebtoken';

const app = express();

export const LoginAppCtrl = function (req, res) {
    const data = req.body;
    console.log(req.body)

    loginMdl(data, function (err, results) {
        if (err) {
            return res.status(400).json({ status: 400, message: "Not able to process the request, please try again" });
        }

        if (results.length <= 0) {
            return res.status(404).json({ status: 404, message: "Email not found" });
        }

        const validPass = (req.body.Password === results[0].password);
        if (!validPass) {
            return res.status(400).json({ status: 400, message: "Invalid password" });
        }

        const SecretKey = process.env.SecretKey;
        if (!SecretKey) {
            return res.status(500).json({ status: 500, message: "Internal server error: SecretKey not defined" });
        }

        const payload = { subject: req.body.userEmail };
        const token = Jwt.sign(payload, SecretKey, { expiresIn: "1h" });

        return res.status(200).json({
            status: 200,
            message: "Login successful",
            results,
            token
        });
    });
};

export const createUserCtrl = (req, res) => {
    const userData = req.body;

    createUserMdl(userData, (err, results) => {
        if (err) {
            if (err.message === "Email already exists") {
                return res.status(400).json({ status: 400, message: "Email already exists" });
            } else if (err.message === "Username already exists") {
                return res.status(400).json({ status: 400, message: "Username already exists" });
            } else {
                return res.status(500).json({ status: 500, message: "Internal server error" });
            }
        } 

        return res.status(201).json({ status: 201, message: "User registered successfully" });
    });
};

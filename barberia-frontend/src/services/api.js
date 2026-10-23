import axios from 'axios';

// Cambia el '192.168.X.X' por la IP real de tu Mac en tu red local
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
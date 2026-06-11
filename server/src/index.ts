import 'dotenv/config';
import app from './app';
import { initWhatsApp } from './services/whatsapp';

const PORT = process.env.PORT || 3000;

initWhatsApp().catch(console.error);

app.listen(PORT, () => {
  console.log(`Qova server running on port ${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/docs`);
});

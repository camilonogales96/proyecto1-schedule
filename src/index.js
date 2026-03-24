const fs = require('fs').promises;
const path = require('path');

class FileStorage {
  constructor(filePath) {
    this.filePath = filePath;
    this.idCounter = 1;
    this._ensureFileExists();
  }

  async _ensureFileExists() {
    try {
      await fs.access(this.filePath);
      const data = await this._readFile();
      if (data.length > 0) {
        this.idCounter = Math.max(...data.map(d => d.id)) + 1;
      }
    } catch {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await this._writeFile([]);
    }
  }

  async _readFile() {
    try {
      const data = await fs.readFile(this.filePath, 'utf8');
      if (!data.trim()) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map(item => ({
        ...item,
        createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : undefined,
        cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : undefined
      }));
    } catch (error) {
      throw new Error(`Error leyendo archivo JSON: ${error.message}`);
    }
  }

  async _writeFile(data) {
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async save(appointment) {
    const data = await this._readFile();
    
    const newAppointment = {
      ...appointment,
      id: this.idCounter++,
      createdAt: new Date()
    };

    data.push(newAppointment);
    await this._writeFile(data);
    
    return newAppointment;
  }

  async getById(id) {
    const data = await this._readFile();
    return data.find(item => item.id === id) || null;
  }

  async getAll() {
    const data = await this._readFile();
    return [...data];
  }

  async findByDateRange(startDate, endDate) {
    const data = await this._readFile();
    return data.filter(item => 
      item.date >= startDate && item.date <= endDate
    );
  }

  async findByEmail(email) {
    const data = await this._readFile();
    const searchEmail = email.toLowerCase();
    return data.filter(item => 
      item.email.toLowerCase() === searchEmail
    );
  }

  async update(id, updates) {
    const data = await this._readFile();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) return null;

    const { id: _, ...safeUpdates } = updates;

    data[index] = {
      ...data[index],
      ...safeUpdates,
      updatedAt: new Date()
    };

    await this._writeFile(data);
    return data[index];
  }

  async delete(id) {
    const data = await this._readFile();
    const index = data.findIndex(item => item.id === id);
    
    if (index === -1) return false;

    data.splice(index, 1);
    await this._writeFile(data);
    return true;
  }
}

module.exports = FileStorage;
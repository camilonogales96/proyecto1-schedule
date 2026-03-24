const fs = require('fs').promises;
const path = require('path');
const FileStorage = require('../src/storage/fileStorage');

describe('FileStorage - Persistencia JSON', () => {
  const testFilePath = path.join(__dirname, '../data/test-appointments.json');
  let storage;

  beforeEach(async () => {
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, JSON.stringify([]));
    storage = new FileStorage(testFilePath);
  });

  afterAll(async () => {
    try {
      await fs.unlink(testFilePath);
    } catch (e) {

    }
  });

  // =====================================================
  // TESTS: CREAR/GUARDAR (INSERT)
  // =====================================================

  describe('save() - Crear cita en JSON', () => {
    
    test('✅ debe guardar cita y asignar ID autoincremental', async () => {
      const appointment = {
        date: '2024-12-25',
        time: '10:00',
        duration: 30,
        email: 'test@email.com',
      };

      const result = await storage.save(appointment);

      expect(result.id).toBe(1);
      expect(result.date).toBe('2024-12-25');
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    test('✅ debe persistir en archivo JSON', async () => {
      const appointment = {
        date: '2024-12-25',
        time: '10:00',
        duration: 30,
        email: 'persist@email.com',
      };

      await storage.save(appointment);

      const fileContent = await fs.readFile(testFilePath, 'utf8');
      const data = JSON.parse(fileContent);

      expect(data).toHaveLength(1);
      expect(data[0].email).toBe('persist@email.com');
      expect(data[0].id).toBe(1);
    });

    test('✅ debe asignar IDs secuenciales (1, 2, 3...)', async () => {
      const app1 = await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: '1@test.com' });
      const app2 = await storage.save({ date: '2024-12-25', time: '11:00', duration: 30, email: '2@test.com' });
      const app3 = await storage.save({ date: '2024-12-25', time: '12:00', duration: 30, email: '3@test.com' });

      expect(app1.id).toBe(1);
      expect(app2.id).toBe(2);
      expect(app3.id).toBe(3);
    });

    test('✅ debe crear archivo JSON si no existe', async () => {
      const newPath = path.join(__dirname, '../data/new-file.json');
      const newStorage = new FileStorage(newPath);
      
      await newStorage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: 'new@file.com' });
      
      const exists = await fs.access(newPath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      await fs.unlink(newPath);
    });
  });

  // =====================================================
  // TESTS: OBTENER (SELECT)
  // =====================================================

  describe('getById() - Buscar por ID', () => {
    
    beforeEach(async () => {
      await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: 'find@email.com', clientName: 'Find Me' });
    });

    test('✅ debe encontrar cita existente por ID', async () => {
      const found = await storage.getById(1);
      
      expect(found).not.toBeNull();
      expect(found.email).toBe('find@email.com');
    });

    test('✅ debe retornar null si ID no existe', async () => {
      const found = await storage.getById(999);
      expect(found).toBeNull();
    });

    test('✅ debe retornar null para ID negativo o cero', async () => {
      expect(await storage.getById(-1)).toBeNull();
      expect(await storage.getById(0)).toBeNull();
    });
  });

  describe('getAll() - Listar todas', () => {
    
    test('✅ debe retornar array vacío si no hay citas', async () => {
      const all = await storage.getAll();
      expect(all).toEqual([]);
    });

    test('✅ debe retornar todas las citas guardadas', async () => {
      await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: '1@email.com' });
      await storage.save({ date: '2024-12-25', time: '11:00', duration: 30, email: '2@email.com' });
      await storage.save({ date: '2024-12-25', time: '12:00', duration: 30, email: '3@email.com' });

      const all = await storage.getAll();
      expect(all).toHaveLength(3);
      expect(all.map(a => a.email)).toContain('2@email.com');
    });

    test('✅ debe retornar copia de datos (no referencia directa)', async () => {
      await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: 'copy@test.com' });
      
      const all = await storage.getAll();
      all[0].email = 'MODIFICADO';
      
      const allAgain = await storage.getAll();
      expect(allAgain[0].email).toBe('copy@test.com');
    });
  });

  describe('findByDateRange() - Buscar por rango de fechas', () => {
    
    beforeEach(async () => {
      await storage.save({ date: '2024-12-20', time: '10:00', duration: 30, email: '20@email.com' });
      await storage.save({ date: '2024-12-25', time: '11:00', duration: 30, email: '25@email.com' });
      await storage.save({ date: '2024-12-30', time: '12:00', duration: 30, email: '30@email.com' });
      await storage.save({ date: '2025-01-05', time: '13:00', duration: 30, email: '05@email.com' });
    });

    test('✅ debe encontrar citas dentro del rango inclusive', async () => {
      const results = await storage.findByDateRange('2024-12-20', '2024-12-30');
      
      expect(results).toHaveLength(3);
      expect(results.map(r => r.date)).toEqual(['2024-12-20', '2024-12-25', '2024-12-30']);
    });

    test('✅ debe retornar array vacío si no hay citas en rango', async () => {
      const results = await storage.findByDateRange('2025-02-01', '2025-02-28');
      expect(results).toEqual([]);
    });

    test('✅ debe manejar rango de un solo día', async () => {
      const results = await storage.findByDateRange('2024-12-25', '2024-12-25');
      expect(results).toHaveLength(1);
      expect(results[0].email).toBe('25@email.com');
    });
  });

  describe('findByEmail() - Buscar por email', () => {
    
    beforeEach(async () => {
      await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: 'cliente@email.com' });
      await storage.save({ date: '2024-12-26', time: '11:00', duration: 30, email: 'cliente@email.com' });
      await storage.save({ date: '2024-12-27', time: '12:00', duration: 30, email: 'otro@email.com' });
    });

    test('✅ debe encontrar todas las citas de un email', async () => {
      const results = await storage.findByEmail('cliente@email.com');
      
      expect(results).toHaveLength(2);
      expect(results.every(r => r.email === 'cliente@email.com')).toBe(true);
    });

    test('✅ debe retornar array vacío si email no tiene citas', async () => {
      const results = await storage.findByEmail('noexiste@email.com');
      expect(results).toEqual([]);
    });

    test('✅ debe ser case-insensitive en búsqueda de email', async () => {
      const results = await storage.findByEmail('CLIENTE@EMAIL.COM');
      expect(results).toHaveLength(2);
    });
  });

  // =====================================================
  // TESTS: ACTUALIZAR (UPDATE)
  // =====================================================

  describe('update() - Modificar cita', () => {
    let existingId;

    beforeEach(async () => {
      const created = await storage.save({ 
        date: '2024-12-25', 
        time: '10:00', 
        duration: 30, 
        email: 'original@email.com',
        clientName: 'Original',
        status: 'scheduled'
      });
      existingId = created.id;
    });

    test('✅ debe actualizar campos y mantener ID', async () => {
      const updates = {
        time: '14:00',
        duration: 60,
        email: 'actualizado@email.com'
      };

      const updated = await storage.update(existingId, updates);

      expect(updated.id).toBe(existingId);
      expect(updated.time).toBe('14:00');
      expect(updated.duration).toBe(60);
      expect(updated.email).toBe('actualizado@email.com');
      expect(updated.clientName).toBe('Original'); // No modificado
    });

    test('✅ debe agregar updatedAt al actualizar', async () => {
      const before = new Date();
      const updated = await storage.update(existingId, { time: '15:00' });
      const after = new Date();

      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updated.updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('✅ debe persistir cambios en archivo JSON', async () => {
      await storage.update(existingId, { status: 'confirmed' });

      const fileContent = await fs.readFile(testFilePath, 'utf8');
      const data = JSON.parse(fileContent);

      expect(data[0].status).toBe('confirmed');
      expect(data[0].updatedAt).toBeDefined();
    });

    test('✅ debe retornar null si ID no existe', async () => {
      const result = await storage.update(999, { time: '16:00' });
      expect(result).toBeNull();
    });

    test('❌ no debe modificar el ID', async () => {
      const updated = await storage.update(existingId, { id: 999, time: '17:00' });
      
      expect(updated.id).toBe(1); // Mantiene ID original
      expect(updated.time).toBe('17:00');
    });
  });

  // =====================================================
  // TESTS: ELIMINAR/CANCELAR (DELETE)
  // =====================================================

  describe('delete() - Eliminar/Cancelar cita', () => {
    let idToDelete;

    beforeEach(async () => {
      const created = await storage.save({ 
        date: '2024-12-25', 
        time: '10:00', 
        duration: 30, 
        email: 'delete@email.com' 
      });
      idToDelete = created.id;
    });

    test('✅ debe eliminar cita y retornar true', async () => {
      const result = await storage.delete(idToDelete);
      expect(result).toBe(true);
    });

    test('✅ debe eliminar de archivo JSON permanentemente', async () => {
      await storage.delete(idToDelete);

      const fileContent = await fs.readFile(testFilePath, 'utf8');
      const data = JSON.parse(fileContent);

      expect(data).toHaveLength(0);
    });

    test('✅ getById debe retornar null después de eliminar', async () => {
      await storage.delete(idToDelete);
      const found = await storage.getById(idToDelete);
      expect(found).toBeNull();
    });

    test('✅ debe retornar false si ID no existe', async () => {
      const result = await storage.delete(999);
      expect(result).toBe(false);
    });

    test('✅ no debe afectar otras citas al eliminar una', async () => {
      const second = await storage.save({ 
        date: '2024-12-26', 
        time: '11:00', 
        duration: 30, 
        email: 'keep@email.com' 
      });

      await storage.delete(idToDelete);

      const all = await storage.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].email).toBe('keep@email.com');
    });
  });

  // =====================================================
  // TESTS: MANEJO DE ERRORES Y EDGE CASES
  // =====================================================

  describe('Manejo de errores y edge cases', () => {
    
    test('❌ debe manejar archivo JSON corrupto', async () => {
      // Escribir JSON inválido
      await fs.writeFile(testFilePath, 'esto no es json {');

      await expect(storage.getAll()).rejects.toThrow();
    });

    test('✅ debe manejar archivo vacío como array vacío', async () => {
      await fs.writeFile(testFilePath, ''); // Archivo vacío
      
      const all = await storage.getAll();
      expect(all).toEqual([]);
    });

    test('✅ debe manejar múltiples instancias concurrentes', async () => {
      const storage2 = new FileStorage(testFilePath);
      
      await storage.save({ date: '2024-12-25', time: '10:00', duration: 30, email: 's1@email.com' });
      await storage2.save({ date: '2024-12-25', time: '11:00', duration: 30, email: 's2@email.com' });

      const all = await storage.getAll();
      expect(all).toHaveLength(2);
    });

    test('Debe soportar caracteres especiales en datos', async () => {
      const special = {
        date: '2024-12-25',
        time: '10:00',
        duration: 30,
        email: 'señor+test@email.com',
        clientName: 'José María Ñoño',
        notes: 'Cita con "comillas" y \\backslash\\'
      };

      const saved = await storage.save(special);
      const retrieved = await storage.getById(saved.id);

      expect(retrieved.clientName).toBe('José María Ñoño');
      expect(retrieved.notes).toBe('Cita con "comillas" y \\backslash\\');
    });

    test('Debe manejar fechas en formato correctamente', async () => {
      const appointment = {
        date: '2024-12-25',
        time: '10:00',
        duration: 30,
        email: 'dates@email.com',
        createdAt: new Date('2024-12-20T10:30:00.000Z')
      };

      const saved = await storage.save(appointment);
      expect(saved.createdAt).toBeInstanceOf(Date);
      
      // Verificar que se persiste correctamente
      const fileContent = await fs.readFile(testFilePath, 'utf8');
      expect(fileContent).toContain('2024-12-20T10:30:00.000Z');
    });
  });
});
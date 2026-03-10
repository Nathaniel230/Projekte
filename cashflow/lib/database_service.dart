import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class DatabaseService {
  Future<int> insertSchuld(int kontoId, double betrag, DateTime datum) async {
    final db = await database;
    final id = await db.insert('transaktionen', {
      'kontoId': kontoId,
      'betrag': betrag,
      'beschreibung': 'Schuld',
      'datum': datum.toIso8601String(),
    });
    final konto =
        await db.query('konten', where: 'id = ?', whereArgs: [kontoId]);
    if (konto.isNotEmpty) {
      final newSaldoMitSchulden =
          (konto.first['saldoMitSchulden'] as double) + betrag;
      await db.update('konten', {'saldoMitSchulden': newSaldoMitSchulden},
          where: 'id = ?', whereArgs: [kontoId]);
    }
    return id;
  }

  static final DatabaseService _instance = DatabaseService._internal();
  factory DatabaseService() => _instance;
  DatabaseService._internal();

  Database? _db;

  Future<Database> get database async {
    if (_db != null) return _db!;
    _db = await _initDb();
    return _db!;
  }

  Future<Database> _initDb() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'cashflow.db');
    return await openDatabase(
      path,
      version: 1,
      onCreate: _onCreate,
    );
  }

  Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE konten (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        saldo REAL,
        saldoMitSchulden REAL
      )
    ''');
    await db.execute('''
      CREATE TABLE transaktionen (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kontoId INTEGER,
        betrag REAL,
        beschreibung TEXT,
        datum TEXT,
        FOREIGN KEY (kontoId) REFERENCES konten(id)
      )
    ''');
  }

  Future<int> insertKonto(
      String name, double saldo, double saldoMitSchulden) async {
    final db = await database;
    return await db.insert('konten', {
      'name': name,
      'saldo': saldo,
      'saldoMitSchulden': saldoMitSchulden,
    });
  }

  Future<List<Map<String, dynamic>>> getKonten() async {
    final db = await database;
    return await db.query('konten');
  }

  Future<int> insertTransaktion(
      int kontoId, double betrag, String beschreibung, DateTime datum) async {
    final db = await database;
    final id = await db.insert('transaktionen', {
      'kontoId': kontoId,
      'betrag': betrag,
      'beschreibung': beschreibung,
      'datum': datum.toIso8601String(),
    });
    // Salden aktualisieren
    final konto =
        await db.query('konten', where: 'id = ?', whereArgs: [kontoId]);
    if (konto.isNotEmpty) {
      final newSaldo = (konto.first['saldo'] as double) + betrag;
      final newSaldoMitSchulden =
          (konto.first['saldoMitSchulden'] as double) + betrag;
      await db.update(
          'konten',
          {
            'saldo': newSaldo,
            'saldoMitSchulden': newSaldoMitSchulden,
          },
          where: 'id = ?',
          whereArgs: [kontoId]);
    }
    return id;
  }

  Future<void> deleteTransaktion(int transaktionId) async {
    final db = await database;
    final trs = await db
        .query('transaktionen', where: 'id = ?', whereArgs: [transaktionId]);
    if (trs.isEmpty) return;
    final tr = trs.first;
    final kontoId = tr['kontoId'] as int;
    final betrag = tr['betrag'] as double;
    final beschreibung = tr['beschreibung'] as String? ?? '';

    // Delete transaction
    await db
        .delete('transaktionen', where: 'id = ?', whereArgs: [transaktionId]);

    // Update konto balances
    final konto =
        await db.query('konten', where: 'id = ?', whereArgs: [kontoId]);
    if (konto.isEmpty) return;
    final current = konto.first;
    final double currentSaldo = current['saldo'] as double;
    final double currentSaldoMitSchulden =
        current['saldoMitSchulden'] as double;

    if (beschreibung == 'Schuld') {
      final newSaldoMitSchulden = currentSaldoMitSchulden - betrag;
      await db.update('konten', {'saldoMitSchulden': newSaldoMitSchulden},
          where: 'id = ?', whereArgs: [kontoId]);
    } else {
      final newSaldo = currentSaldo - betrag;
      final newSaldoMitSchulden = currentSaldoMitSchulden - betrag;
      await db.update('konten',
          {'saldo': newSaldo, 'saldoMitSchulden': newSaldoMitSchulden},
          where: 'id = ?', whereArgs: [kontoId]);
    }
  }

  Future<void> resetAllSchulden() async {
    final db = await database;
    await db.delete('transaktionen',
        where: 'beschreibung = ?', whereArgs: ['Schuld']);
    // Set saldoMitSchulden = saldo for all konten
    await db.rawUpdate('UPDATE konten SET saldoMitSchulden = saldo');
  }

  Future<List<Map<String, dynamic>>> getTransaktionenForKonto(
      int kontoId) async {
    final db = await database;
    final result = await db
        .query('transaktionen', where: 'kontoId = ?', whereArgs: [kontoId]);
    final list = result.toList(); // Kopie für Sortierung
    list.sort((a, b) => (b['datum'] as String).compareTo(a['datum'] as String));
    return list;
  }

  Future<void> deleteKonto(int kontoId) async {
    final db = await database;
    await db
        .delete('transaktionen', where: 'kontoId = ?', whereArgs: [kontoId]);
    await db.delete('konten', where: 'id = ?', whereArgs: [kontoId]);
  }
}

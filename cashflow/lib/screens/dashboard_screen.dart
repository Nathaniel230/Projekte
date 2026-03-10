import 'package:flutter/material.dart';
import '../database_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<List<Map<String, dynamic>>> _kontenFuture;
  late Future<List<Map<String, dynamic>>> _schuldenFuture;

  @override
  void initState() {
    super.initState();
    _kontenFuture = DatabaseService().getKonten();
    _schuldenFuture = _fetchSchulden();
  }

  Future<List<Map<String, dynamic>>> _fetchSchulden() async {
    final db = await DatabaseService().database;
    return await db.query('transaktionen',
        where: "beschreibung = ?", whereArgs: ['Schuld']);
  }

  Future<void> _refreshKonten() async {
    setState(() {
      _kontenFuture = DatabaseService().getKonten();
      _schuldenFuture = _fetchSchulden();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("CashFlow"),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: FutureBuilder<List<Map<String, dynamic>>>(
          future: _kontenFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Center(child: CircularProgressIndicator());
            }
            if (!snapshot.hasData || snapshot.data!.isEmpty) {
              return const Center(child: Text('Keine Konten vorhanden'));
            }
            final konten = snapshot.data!;
            double gesamtsaldo = 0.0;
            for (var konto in konten) {
              gesamtsaldo += (konto['saldo'] ?? 0.0) as double;
            }
            return FutureBuilder<List<Map<String, dynamic>>>(
              future: _schuldenFuture,
              builder: (context, schuldenSnapshot) {
                if (schuldenSnapshot.connectionState ==
                    ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final schuldenList = schuldenSnapshot.data ?? [];
                double schuldenSumme = 0.0;
                for (var s in schuldenList) {
                  schuldenSumme += (s['betrag'] ?? 0.0) as double;
                }
                return RefreshIndicator(
                  onRefresh: _refreshKonten,
                  child: ListView(
                    children: [
                      // Kontenübersicht
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Kontenübersicht",
                                style: TextStyle(
                                  fontSize: 19,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.deepPurple,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ...konten.map((konto) {
                                return Padding(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 6),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        konto["name"].toString(),
                                        style: const TextStyle(fontSize: 16),
                                      ),
                                      Text(
                                        "${(konto["saldo"] as double).toStringAsFixed(2)} CHF",
                                        style: TextStyle(
                                          color: (konto["saldo"] as double) < 0
                                              ? Colors.red
                                              : Colors.green,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Gesamtsaldo
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "Gesamtsaldo:",
                                style: TextStyle(fontSize: 16),
                              ),
                              Text(
                                "${gesamtsaldo.toStringAsFixed(2)} CHF",
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: gesamtsaldo < 0
                                      ? Colors.red
                                      : Colors.green,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Schulden
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(18),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                "Summe Schulden:",
                                style: TextStyle(fontSize: 16),
                              ),
                              Text(
                                schuldenSumme.toStringAsFixed(2),
                                style: TextStyle(
                                  color: schuldenSumme < 0
                                      ? Colors.red
                                      : Colors.green,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

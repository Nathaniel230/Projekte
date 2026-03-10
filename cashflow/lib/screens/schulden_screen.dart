import 'package:flutter/material.dart';
import '../database_service.dart';

class SchuldenScreen extends StatefulWidget {
  const SchuldenScreen({super.key});

  @override
  State<SchuldenScreen> createState() => _SchuldenScreenState();
}

class _SchuldenScreenState extends State<SchuldenScreen> {
  late Future<List<Map<String, dynamic>>> _kontenFuture;
  int? _selectedKontoId;
  late Future<List<Map<String, dynamic>>> _schuldenFuture;

  @override
  void initState() {
    super.initState();
    _kontenFuture = DatabaseService().getKonten();
    _schuldenFuture = Future.value([]); // initial leer
  }

  void _selectKonto(int kontoId) {
    setState(() {
      _selectedKontoId = kontoId;
      _schuldenFuture = DatabaseService().getTransaktionenForKonto(kontoId);
    });
  }

  Future<void> _refreshKonten() async {
    setState(() {
      _kontenFuture = DatabaseService().getKonten();
      if (_selectedKontoId != null) {
        _schuldenFuture =
            DatabaseService().getTransaktionenForKonto(_selectedKontoId!);
      }
    });
  }

  void _showSchuldDialog(int kontoId, bool ichSchulde) async {
    String betragStr = "";
    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title:
              Text(ichSchulde ? 'Ich schulde jemandem' : 'Mir schuldet jemand'),
          content: TextField(
            decoration: InputDecoration(hintText: 'Betrag (z.B. 20)'),
            keyboardType: TextInputType.number,
            onChanged: (value) => betragStr = value,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (double.tryParse(betragStr) != null) {
                  final betrag =
                      double.parse(betragStr) * (ichSchulde ? -1 : 1);
                  final id = await DatabaseService().insertSchuld(
                    kontoId,
                    betrag,
                    DateTime.now(),
                  );
                  // Debug: Zeige die gespeicherte Transaktion direkt nach Insert
                  final db = await DatabaseService().database;
                  final inserted = await db
                      .query('transaktionen', where: 'id = ?', whereArgs: [id]);
                  print(
                      'DEBUG: Nach Insert, gespeicherte Transaktion: $inserted');
                  Navigator.of(context).pop();
                  // Force reload after insert
                  setState(() {
                    _kontenFuture = DatabaseService().getKonten();
                    _schuldenFuture =
                        DatabaseService().getTransaktionenForKonto(kontoId);
                  });
                }
              },
              child: const Text('Hinzufügen'),
            ),
          ],
        );
      },
    );
  }

  void _showSchuldBezahltDialog(int transaktionId, int kontoId) async {
    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Schuld bezahlt?'),
          content:
              const Text('Möchtest du diese Schuld als bezahlt markieren?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                await DatabaseService().deleteTransaktion(transaktionId);
                Navigator.of(context).pop();
                // Force reload after delete
                setState(() {
                  _kontenFuture = DatabaseService().getKonten();
                  _schuldenFuture =
                      DatabaseService().getTransaktionenForKonto(kontoId);
                });
              },
              child: const Text('Bezahlt'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Schulden'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refreshKonten,
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
                return ListView(
                  children: [
                    ...konten.map((konto) {
                      return Card(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        elevation: 4,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        color: Colors.white,
                        child: InkWell(
                          onTap: () => _selectKonto(konto['id'] as int),
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  konto['name'].toString(),
                                  style: const TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.deepPurple),
                                ),
                                if (_selectedKontoId == konto['id']) ...[
                                  const SizedBox(height: 16),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () => _showSchuldDialog(
                                              konto['id'] as int, true),
                                          child: const Text(
                                              'Ich schulde jemandem'),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: ElevatedButton(
                                          onPressed: () => _showSchuldDialog(
                                              konto['id'] as int, false),
                                          child:
                                              const Text('Mir schuldet jemand'),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  FutureBuilder<List<Map<String, dynamic>>>(
                                    future: _schuldenFuture,
                                    builder: (context, schuldenSnapshot) {
                                      if (schuldenSnapshot.connectionState ==
                                          ConnectionState.waiting) {
                                        return const Center(
                                            child: CircularProgressIndicator());
                                      }
                                      final alleTransaktionen =
                                          schuldenSnapshot.data ?? [];
                                      final schulden = alleTransaktionen
                                          .where((s) =>
                                              s['beschreibung'] == 'Schuld')
                                          .toList();
                                      if (schulden.isEmpty) {
                                        return Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            const Text(
                                                'Keine offenen Schulden'),
                                          ],
                                        );
                                      }
                                      double summe = schulden.fold(
                                          0.0,
                                          (prev, s) =>
                                              prev +
                                              (s['betrag'] as double? ?? 0.0));
                                      return Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                              'Schulden: ${summe.toStringAsFixed(2)} CHF',
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold)),
                                          const SizedBox(height: 8),
                                          ...schulden.map((s) {
                                            final betrag =
                                                s['betrag'] as double? ?? 0.0;
                                            return InkWell(
                                              onTap: () =>
                                                  _showSchuldBezahltDialog(
                                                      s['id'] as int,
                                                      konto['id'] as int),
                                              child: Padding(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        vertical: 4),
                                                child: Row(
                                                  children: [
                                                    Text(
                                                      (betrag < 0
                                                          ? 'Ich schulde: '
                                                          : 'Mir schuldet: '),
                                                      style: TextStyle(
                                                          color: betrag >= 0
                                                              ? Colors.green
                                                              : Colors.red),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Text(
                                                      '${betrag.toStringAsFixed(2)} CHF',
                                                      style: TextStyle(
                                                          color: betrag >= 0
                                                              ? Colors.green
                                                              : Colors.red),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            );
                                          }).toList(),
                                        ],
                                      );
                                    },
                                  ),
                                ],
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  ],
                );
              }),
        ),
      ),
    );
  }
}

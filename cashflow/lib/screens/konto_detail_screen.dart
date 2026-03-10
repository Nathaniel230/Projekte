import 'package:flutter/material.dart';
import '../models/konto.dart';
import '../database_service.dart';

class KontoDetailScreen extends StatefulWidget {
  final Konto konto;
  const KontoDetailScreen({Key? key, required this.konto}) : super(key: key);

  @override
  State<KontoDetailScreen> createState() => _KontoDetailScreenState();
}

class _KontoDetailScreenState extends State<KontoDetailScreen> {
  late Future<List<Map<String, dynamic>>> _transaktionenFuture;
  late Konto _konto;

  @override
  void initState() {
    super.initState();
    _konto = widget.konto;
    _transaktionenFuture =
        DatabaseService().getTransaktionenForKonto(_konto.id!);
  }

  Future<void> _addTransaktionDialog({required bool isEinnahme}) async {
    double betrag = 0.0;
    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title:
              Text(isEinnahme ? 'Einnahme hinzufügen' : 'Ausgabe hinzufügen'),
          content: TextField(
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(hintText: 'Betrag'),
            onChanged: (value) {
              betrag = double.tryParse(value) ?? 0.0;
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (betrag != 0.0) {
                  final db = DatabaseService();
                  final signedBetrag = isEinnahme ? betrag : -betrag;
                  await db.insertTransaktion(_konto.id!, signedBetrag,
                      isEinnahme ? 'Einnahme' : 'Ausgabe', DateTime.now());
                  // Kontostand aktualisieren
                  final kontenMaps = await db.getKonten();
                  final updated =
                      kontenMaps.firstWhere((k) => k['id'] == _konto.id);
                  setState(() {
                    _konto = Konto.fromMap(updated);
                  });
                  Navigator.of(context).pop();
                  setState(() {
                    _transaktionenFuture =
                        DatabaseService().getTransaktionenForKonto(_konto.id!);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Konto: ${_konto.name}'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Kontostand: ${_konto.saldo.toStringAsFixed(2)} CHF',
                style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 12),
            Text(
                'Kontostand inkl. Schulden: ${_konto.saldoMitSchulden.toStringAsFixed(2)} CHF',
                style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 32),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _addTransaktionDialog(isEinnahme: true),
                    child: const Text('Einnahme hinzufügen'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _addTransaktionDialog(isEinnahme: false),
                    child: const Text('Ausgabe hinzufügen'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.delete),
                label: const Text('Konto löschen'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
                onPressed: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Konto löschen'),
                      content: Text(
                          'Möchtest du das Konto "${_konto.name}" wirklich löschen? Alle zugehörigen Transaktionen werden auch gelöscht.'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(context).pop(false),
                          child: const Text('Abbrechen'),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                          ),
                          onPressed: () => Navigator.of(context).pop(true),
                          child: const Text('Löschen'),
                        ),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    final db = DatabaseService();
                    await db.deleteKonto(_konto.id!);
                    // close detail screen and return to konten list
                    Navigator.of(context).pop();
                  }
                },
              ),
            ),
            const SizedBox(height: 32),
            Text('Letzte 5 Transaktionen:',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            FutureBuilder<List<Map<String, dynamic>>>(
              future: _transaktionenFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (!snapshot.hasData || snapshot.data!.isEmpty) {
                  return const Text('Keine Transaktionen vorhanden');
                }
                final trans = snapshot.data!;
                final last5 = trans.take(5).toList();
                return Column(
                  children: last5.map((t) {
                    final betrag = t['betrag'] as double;
                    final beschreibung = t['beschreibung'] as String;
                    final datum = t['datum'] as String;
                    return ListTile(
                      title: Text(
                        '${beschreibung == 'Einnahme' ? 'Einnahme' : 'Ausgabe'}: ${betrag.toStringAsFixed(2)} CHF',
                        style: TextStyle(
                          color: beschreibung == 'Einnahme'
                              ? Colors.green
                              : Colors.red,
                        ),
                      ),
                      subtitle: Text('am ${datum.substring(0, 10)}'),
                    );
                  }).toList(),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

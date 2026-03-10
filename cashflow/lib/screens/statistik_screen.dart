import 'package:flutter/material.dart';
import '../database_service.dart';
import 'package:fl_chart/fl_chart.dart';

class StatistikScreen extends StatelessWidget {
  Widget buildSchuldenPieChart(
      List<Map<String, dynamic>> konten, List<Map<String, dynamic>> schulden) {
    // Mappe KontoId auf Schulden
    Map<int, double> schuldenMap = {};
    for (var s in schulden) {
      final kontoId = s['kontoId'] as int;
      schuldenMap[kontoId] =
          (schuldenMap[kontoId] ?? 0.0) + (s['betrag'] as double);
    }
    // Filtere nur Konten mit Schulden
    final kontenMitSchulden =
        konten.where((k) => schuldenMap.containsKey(k['id'])).toList();
    final total =
        schuldenMap.values.fold<double>(0.0, (sum, v) => sum + v.abs());
    if (total == 0 || kontenMitSchulden.isEmpty) {
      return const Text('Keine Schulden vorhanden');
    }
    return Column(
      children: [
        SizedBox(
          height: 220,
          child: PieChart(
            PieChartData(
              sections: [
                for (var i = 0; i < kontenMitSchulden.length; i++)
                  PieChartSectionData(
                    value: schuldenMap[kontenMitSchulden[i]['id']]!.abs(),
                    title: '',
                    color: pieColors[i % pieColors.length],
                    radius: 60,
                  ),
              ],
              sectionsSpace: 2,
              centerSpaceRadius: 40,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          children: [
            for (var i = 0; i < kontenMitSchulden.length; i++)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                      width: 16,
                      height: 16,
                      color: pieColors[i % pieColors.length]),
                  const SizedBox(width: 6),
                  Text(
                      '${kontenMitSchulden[i]['name']} (${schuldenMap[kontenMitSchulden[i]['id']]!.abs().toStringAsFixed(2)} CHF)',
                      style: const TextStyle(fontSize: 13)),
                ],
              ),
          ],
        ),
      ],
    );
  }

  final List<Color> pieColors = [
    Colors.blue,
    Colors.green,
    Colors.orange,
    Colors.purple,
    Colors.red,
    Colors.teal,
    Colors.amber
  ];

  Widget buildPieChart(List<Map<String, dynamic>> konten) {
    final total =
        konten.fold<double>(0.0, (sum, k) => sum + (k['saldo'] as double));
    if (total == 0) {
      return const Text('Keine Salden vorhanden');
    }
    return Column(
      children: [
        SizedBox(
          height: 220,
          child: PieChart(
            PieChartData(
              sections: [
                for (var i = 0; i < konten.length; i++)
                  PieChartSectionData(
                    value: (konten[i]['saldo'] as double).abs(),
                    title: '',
                    color: pieColors[i % pieColors.length],
                    radius: 60,
                  ),
              ],
              sectionsSpace: 2,
              centerSpaceRadius: 40,
            ),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          children: [
            for (var i = 0; i < konten.length; i++)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                      width: 16,
                      height: 16,
                      color: pieColors[i % pieColors.length]),
                  const SizedBox(width: 6),
                  Text(
                      '${konten[i]['name']} (${(konten[i]['saldo'] as double).toStringAsFixed(2)} CHF)',
                      style: const TextStyle(fontSize: 13)),
                ],
              ),
          ],
        ),
      ],
    );
  }

  Future<void> _showEinnahmenAusgaben(BuildContext context) async {
    final db = DatabaseService();
    final trans = await db.database.then((d) => d.query('transaktionen'));
    double einnahmen = 0.0;
    double ausgaben = 0.0;
    for (var t in trans) {
      if (t['beschreibung'] == 'Einnahme') einnahmen += t['betrag'] as double;
      if (t['beschreibung'] == 'Ausgabe') ausgaben += t['betrag'] as double;
    }
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Einnahmen / Ausgaben'),
        content: Text(
            'Einnahmen: ${einnahmen.toStringAsFixed(2)} CHF\nAusgaben: ${(-ausgaben).toStringAsFixed(2)} CHF'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'))
        ],
      ),
    );
  }

  Future<void> _showGesamtschulden(BuildContext context) async {
    final db = DatabaseService();
    final trans = await db.database.then((d) => d.query('transaktionen',
        where: 'beschreibung = ?', whereArgs: ['Schuld']));
    double schulden = 0.0;
    for (var t in trans) {
      schulden += t['betrag'] as double;
    }
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Insgesamte Schulden'),
        content:
            Text('Summe aller Schulden: ${schulden.toStringAsFixed(2)} CHF'),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'))
        ],
      ),
    );
  }

  StatistikScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Statistiken'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 32),
                Text('Saldoverteilung',
                    style:
                        TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                FutureBuilder<List<Map<String, dynamic>>>(
                  future: DatabaseService().getKonten(),
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (!snapshot.hasData || snapshot.data!.isEmpty) {
                      return const Text('Keine Konten vorhanden');
                    }
                    final konten = snapshot.data!;
                    return buildPieChart(konten);
                  },
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

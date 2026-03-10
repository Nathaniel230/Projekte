import 'package:flutter/material.dart';
import '../database_service.dart';
import '../models/konto.dart';
import 'konto_detail_screen.dart';

class KontenScreen extends StatefulWidget {
  const KontenScreen({Key? key}) : super(key: key);

  @override
  State<KontenScreen> createState() => _KontenScreenState();
}

class _KontenScreenState extends State<KontenScreen> {
  late Future<List<Konto>> _kontenFuture;

  @override
  void initState() {
    super.initState();
    _kontenFuture = _fetchKonten();
  }

  Future<List<Konto>> _fetchKonten() async {
    final db = DatabaseService();
    final kontenMaps = await db.getKonten();
    return kontenMaps.map((e) => Konto.fromMap(e)).toList();
  }

  Future<void> _addKontoDialog() async {
    String kontoName = "";
    await showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Neues Konto anlegen'),
          content: TextField(
            autofocus: true,
            decoration: const InputDecoration(hintText: 'Kontoname'),
            onChanged: (value) {
              kontoName = value;
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Abbrechen'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (kontoName.trim().isNotEmpty) {
                  final db = DatabaseService();
                  await db.insertKonto(kontoName.trim(), 0.0, 0.0);
                  setState(() {
                    _kontenFuture = _fetchKonten();
                  });
                  Navigator.of(context).pop();
                }
              },
              child: const Text('Hinzufügen'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _openKontoDetail(Konto konto) async {
    await Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            KontoDetailScreen(konto: konto),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: child,
          );
        },
      ),
    );
    setState(() {
      _kontenFuture = _fetchKonten();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: FutureBuilder<List<Konto>>(
                future: _kontenFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (!snapshot.hasData || snapshot.data!.isEmpty) {
                    return const Center(child: Text('Keine Konten vorhanden'));
                  }
                  final konten = snapshot.data!;
                  return ListView.builder(
                    itemCount: konten.length,
                    itemBuilder: (context, index) {
                      final konto = konten[index];
                      return TweenAnimationBuilder<double>(
                        tween: Tween<double>(begin: 0, end: 1),
                        duration: Duration(milliseconds: 500 + index * 100),
                        builder: (context, value, child) {
                          return Opacity(
                            opacity: value,
                            child: Transform.translate(
                              offset: Offset(0, (1 - value) * 40),
                              child: child,
                            ),
                          );
                        },
                        child: Card(
                          margin: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 8),
                          elevation: 3,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: InkWell(
                            onTap: () => _openKontoDetail(konto),
                            borderRadius: BorderRadius.circular(14),
                            child: Padding(
                              padding: const EdgeInsets.all(18.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          konto.name,
                                          style: const TextStyle(
                                              fontSize: 19,
                                              fontWeight: FontWeight.bold,
                                              color: Colors.deepPurple),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    'Kontostand: ${konto.saldo.toStringAsFixed(2)} CHF',
                                    style: TextStyle(
                                      color: konto.saldo < 0
                                          ? Colors.red
                                          : Colors.green,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                  Text(
                                    'Kontostand inkl. Schulden: ${konto.saldoMitSchulden.toStringAsFixed(2)} CHF',
                                    style: const TextStyle(
                                        fontSize: 15, color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _addKontoDialog,
                  child: const Text('Konto hinzufügen'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

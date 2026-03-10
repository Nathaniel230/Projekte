class Transaktion {
  final int? id;
  final int kontoId;
  final double betrag;
  final String beschreibung;
  final DateTime datum;

  Transaktion(
      {this.id,
      required this.kontoId,
      required this.betrag,
      required this.beschreibung,
      required this.datum});

  factory Transaktion.fromMap(Map<String, dynamic> map) {
    return Transaktion(
      id: map['id'],
      kontoId: map['kontoId'],
      betrag: map['betrag'],
      beschreibung: map['beschreibung'],
      datum: DateTime.parse(map['datum']),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'kontoId': kontoId,
      'betrag': betrag,
      'beschreibung': beschreibung,
      'datum': datum.toIso8601String(),
    };
  }
}

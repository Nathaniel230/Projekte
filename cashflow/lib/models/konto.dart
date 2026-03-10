class Konto {
  final int? id;
  final String name;
  final double saldo;
  final double saldoMitSchulden;

  Konto(
      {this.id,
      required this.name,
      required this.saldo,
      required this.saldoMitSchulden});

  factory Konto.fromMap(Map<String, dynamic> map) {
    return Konto(
      id: map['id'],
      name: map['name'],
      saldo: map['saldo'],
      saldoMitSchulden: map['saldoMitSchulden'] ?? map['saldo'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'saldo': saldo,
      'saldoMitSchulden': saldoMitSchulden,
    };
  }
}

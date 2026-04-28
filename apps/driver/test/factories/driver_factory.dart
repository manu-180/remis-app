class DriverFactory {
  static Map<String, dynamic> online({String id = 'driver-1', String name = 'Juan Pérez'}) => {
    'id': id,
    'full_name': name,
    'is_online': true,
    'is_active': true,
    'rating': 4.8,
    'mobile_number': '+5492954000001',
    'agency_id': 'agency-1',
  };

  static Map<String, dynamic> offline({String id = 'driver-1'}) => {
    ...online(id: id),
    'is_online': false,
  };
}

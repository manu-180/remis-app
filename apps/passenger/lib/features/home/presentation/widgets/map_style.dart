/// Google Maps dark style JSON — matches design system dark tokens.
abstract final class MapStyles {
  static const dark = r'''
[
  {"elementType":"geometry","stylers":[{"color":"#0a0b0f"}]},
  {"elementType":"labels.text.fill","stylers":[{"color":"#7b8194"}]},
  {"elementType":"labels.text.stroke","stylers":[{"color":"#0a0b0f"}]},
  {"featureType":"administrative","elementType":"geometry","stylers":[{"color":"#23262f"}]},
  {"featureType":"administrative.country","elementType":"labels.text.fill","stylers":[{"color":"#9aa0b5"}]},
  {"featureType":"administrative.locality","elementType":"labels.text.fill","stylers":[{"color":"#c4cad8"}]},
  {"featureType":"poi","elementType":"labels.text.fill","stylers":[{"color":"#7b8194"}]},
  {"featureType":"poi.park","elementType":"geometry","stylers":[{"color":"#101218"}]},
  {"featureType":"poi.park","elementType":"labels.text.fill","stylers":[{"color":"#3c4152"}]},
  {"featureType":"road","elementType":"geometry.fill","stylers":[{"color":"#2e323d"}]},
  {"featureType":"road","elementType":"labels.text.fill","stylers":[{"color":"#9aa0b5"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"color":"#23262f"}]},
  {"featureType":"road.highway","elementType":"geometry","stylers":[{"color":"#3a3f4e"}]},
  {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"color":"#23262f"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"color":"#f4f5f9"}]},
  {"featureType":"transit","elementType":"geometry","stylers":[{"color":"#2e323d"}]},
  {"featureType":"transit.station","elementType":"labels.text.fill","stylers":[{"color":"#7b8194"}]},
  {"featureType":"water","elementType":"geometry","stylers":[{"color":"#181b23"}]},
  {"featureType":"water","elementType":"labels.text.fill","stylers":[{"color":"#3d4252"}]}
]
''';
}

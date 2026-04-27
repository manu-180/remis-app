import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/destination_result.dart';
import '../../data/ride_providers.dart';

// ---------------------------------------------------------------------------
// PostGIS WKT parse helper
// ---------------------------------------------------------------------------

/// Parses a PostGIS geography string such as "SRID=4326;POINT(lng lat)"
/// into a [LatLng]. Returns null on any parse failure — never throws.
LatLng? _parseGeoPoint(dynamic val) {
  if (val == null) return null;
  final s = val.toString();
  final m = RegExp(r'POINT\(([^ ]+) ([^)]+)\)').firstMatch(s);
  if (m == null) return null;
  // PostGIS stores POINT(longitude latitude)
  return LatLng(double.parse(m.group(2)!), double.parse(m.group(1)!));
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/// Full-screen overlay shown when the passenger taps "¿A dónde vamos?".
///
/// Calls [onDestinationSelected] with the chosen [DestinationResult] and pops.
/// Closing without a selection pops without invoking the callback.
///
/// Note: Google Places live autocomplete is intentionally omitted. The search
/// field filters the three static sections (Frecuentes, Recientes, Sugerencias)
/// client-side. When the Places API key is available, replace the
/// [_filterSections] approach inside [_onQueryChanged] with a Places SDK call
/// via a SuggestionsCallback passed to flutter_typeahead.
/// TODO(places-api): Wire up Google Places Autocomplete restricted to
///   ~30 km radius around Santa Rosa, La Pampa (-36.6167, -64.2833) once the
///   API key is provisioned in Supabase secrets and exposed via an Edge Function.
class DestinationSearchScreen extends ConsumerStatefulWidget {
  const DestinationSearchScreen({
    super.key,
    required this.onDestinationSelected,
  });

  final void Function(DestinationResult result) onDestinationSelected;

  @override
  ConsumerState<DestinationSearchScreen> createState() =>
      _DestinationSearchScreenState();
}

class _DestinationSearchScreenState
    extends ConsumerState<DestinationSearchScreen> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onQueryChanged(String value) {
    setState(() => _query = value.trim().toLowerCase());
  }

  bool _matches(String text) =>
      _query.isEmpty || text.toLowerCase().contains(_query);

  void _select(DestinationResult result) {
    widget.onDestinationSelected(result);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final frequentAsync = ref.watch(frequentAddressesProvider);
    final recentAsync = ref.watch(recentDestinationsProvider);
    final poisAsync = ref.watch(placePoisProvider);

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ----------------------------------------------------------------
            // Top bar: close + title
            // ----------------------------------------------------------------
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 8, 16, 0),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close),
                    tooltip: 'Cerrar',
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '¿A dónde vamos?',
                    style: theme.textTheme.headlineMedium,
                  ),
                ],
              ),
            ),

            // ----------------------------------------------------------------
            // Search field
            // ----------------------------------------------------------------
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                autofocus: true,
                onChanged: _onQueryChanged,
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: 'Ingresá una dirección o lugar',
                  prefixIcon: Icon(
                    Icons.search,
                    color: isDark
                        ? AppColors.neutralD500
                        : AppColors.neutral500,
                  ),
                  suffixIcon: _query.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear),
                          onPressed: () {
                            _controller.clear();
                            _onQueryChanged('');
                          },
                        )
                      : null,
                ),
              ),
            ),

            // ----------------------------------------------------------------
            // Results list
            // ----------------------------------------------------------------
            Expanded(
              child: ListView(
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                padding: const EdgeInsets.only(bottom: 24),
                children: [
                  _FrequentesSection(
                    asyncValue: frequentAsync,
                    query: _query,
                    matches: _matches,
                    onSelect: _select,
                  ),
                  _RecientesSection(
                    asyncValue: recentAsync,
                    query: _query,
                    matches: _matches,
                    onSelect: _select,
                  ),
                  _SugerenciasSection(
                    asyncValue: poisAsync,
                    query: _query,
                    matches: _matches,
                    onSelect: _select,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Section widgets
// ---------------------------------------------------------------------------

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 4),
      child: Text(
        title,
        style: theme.textTheme.labelLarge
            ?.copyWith(color: AppColors.neutral500),
      ),
    );
  }
}

class _DestinationTile extends StatelessWidget {
  const _DestinationTile({
    required this.label,
    required this.address,
    required this.onTap,
  });

  final String label;
  final String address;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(
        Icons.location_on,
        color: theme.colorScheme.primary,
      ),
      title: Text(label, style: theme.textTheme.bodyLarge),
      subtitle: Text(
        address,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      onTap: onTap,
    );
  }
}

// ---------------------------------------------------------------------------
// Frecuentes
// ---------------------------------------------------------------------------

class _FrequentesSection extends StatelessWidget {
  const _FrequentesSection({
    required this.asyncValue,
    required this.query,
    required this.matches,
    required this.onSelect,
  });

  final AsyncValue<List<Map<String, dynamic>>> asyncValue;
  final String query;
  final bool Function(String text) matches;
  final void Function(DestinationResult) onSelect;

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      loading: () => const _SectionLoading(),
      error: (_, __) => const SizedBox.shrink(),
      data: (rows) {
        final filtered = rows.where((r) {
          final addressText = (r['address_text'] as String? ?? '');
          final label = (r['label'] as String? ?? addressText);
          return matches(addressText) || matches(label);
        }).toList();

        if (filtered.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader('Frecuentes'),
            ...filtered.map((r) {
              final addressText = r['address_text'] as String? ?? '';
              final label = r['label'] as String? ?? addressText;
              final loc = _parseGeoPoint(r['location']);
              return _DestinationTile(
                label: label,
                address: addressText,
                onTap: loc == null
                    ? () {} // location unparseable — disable silently
                    : () => onSelect(DestinationResult(
                          label: label,
                          address: addressText,
                          location: loc,
                        )),
              );
            }),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Recientes
// ---------------------------------------------------------------------------

class _RecientesSection extends StatelessWidget {
  const _RecientesSection({
    required this.asyncValue,
    required this.query,
    required this.matches,
    required this.onSelect,
  });

  final AsyncValue<List<Map<String, dynamic>>> asyncValue;
  final String query;
  final bool Function(String text) matches;
  final void Function(DestinationResult) onSelect;

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      loading: () => const _SectionLoading(),
      error: (_, __) => const SizedBox.shrink(),
      data: (rows) {
        final filtered = rows.where((r) {
          final address = (r['dest_address'] as String? ?? '');
          return matches(address);
        }).toList();

        if (filtered.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader('Recientes'),
            ...filtered.map((r) {
              final address = r['dest_address'] as String? ?? '';
              final loc = _parseGeoPoint(r['dest_location']);
              return _DestinationTile(
                label: address,
                address: address,
                onTap: loc == null
                    ? () {}
                    : () => onSelect(DestinationResult(
                          label: address,
                          address: address,
                          location: loc,
                        )),
              );
            }),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Sugerencias del pueblo (POIs)
// ---------------------------------------------------------------------------

class _SugerenciasSection extends StatelessWidget {
  const _SugerenciasSection({
    required this.asyncValue,
    required this.query,
    required this.matches,
    required this.onSelect,
  });

  final AsyncValue<List<Map<String, dynamic>>> asyncValue;
  final String query;
  final bool Function(String text) matches;
  final void Function(DestinationResult) onSelect;

  @override
  Widget build(BuildContext context) {
    return asyncValue.when(
      loading: () => const _SectionLoading(),
      error: (_, __) => const SizedBox.shrink(), // table may not exist yet
      data: (rows) {
        final filtered = rows.where((r) {
          final name = (r['name'] as String? ?? '');
          final address = (r['address_text'] as String? ?? '');
          return matches(name) || matches(address);
        }).toList();

        if (filtered.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader('Sugerencias del pueblo'),
            ...filtered.map((r) {
              final name = r['name'] as String? ?? '';
              final address = r['address_text'] as String? ?? name;
              final loc = _parseGeoPoint(r['location']);
              return _DestinationTile(
                label: name,
                address: address,
                onTap: loc == null
                    ? () {}
                    : () => onSelect(DestinationResult(
                          label: name,
                          address: address,
                          location: loc,
                        )),
              );
            }),
          ],
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Shared loading indicator for a section
// ---------------------------------------------------------------------------

class _SectionLoading extends StatelessWidget {
  const _SectionLoading();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 12),
      child: Center(
        child: SizedBox(
          width: 20,
          height: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
      ),
    );
  }
}

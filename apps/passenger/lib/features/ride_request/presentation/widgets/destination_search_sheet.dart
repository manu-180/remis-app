import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../../../../core/theme/app_theme.dart';
import '../../data/models/destination_result.dart';
import '../../data/models/place_prediction.dart';
import '../../data/ride_providers.dart';
import '../../data/services/places_service.dart';
import 'tile_skeleton.dart';

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
// Sheet
// ---------------------------------------------------------------------------

/// Bottom-sheet variant of the destination search.
///
/// Mounted inside a [DraggableScrollableSheet] so the map remains visible
/// behind. The sheet auto-expands when the input is focused via
/// [onRequestExpand]; collapses to the initial snap via [onRequestCollapse]
/// when focus is lost while the query is empty.
class DestinationSearchSheet extends ConsumerStatefulWidget {
  const DestinationSearchSheet({
    super.key,
    required this.scrollController,
    required this.onDestinationSelected,
    required this.onRequestExpand,
    required this.onRequestCollapse,
    this.currentLocation,
  });

  final ScrollController scrollController;
  final void Function(DestinationResult result) onDestinationSelected;
  final VoidCallback onRequestExpand;
  final VoidCallback onRequestCollapse;
  final LatLng? currentLocation;

  @override
  ConsumerState<DestinationSearchSheet> createState() =>
      _DestinationSearchSheetState();
}

class _DestinationSearchSheetState
    extends ConsumerState<DestinationSearchSheet> {
  final _controller = TextEditingController();
  final _focusNode = FocusNode();
  String _query = '';            // raw, used for client-side filter
  String _debouncedQuery = '';   // debounced, used for Places API
  bool _isTyping = false;        // true while debounce timer is pending
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _focusNode.addListener(_onFocusChange);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _focusNode.removeListener(_onFocusChange);
    _controller.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onFocusChange() {
    if (_focusNode.hasFocus) {
      widget.onRequestExpand();
    } else if (_query.isEmpty) {
      widget.onRequestCollapse();
    }
  }

  void _onQueryChanged(String value) {
    final trimmed = value.trim();
    setState(() {
      _query = trimmed.toLowerCase();
      _isTyping = trimmed.length >= 2 && trimmed != _debouncedQuery;
    });
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 180), () {
      if (!mounted) return;
      setState(() {
        _debouncedQuery = trimmed;
        _isTyping = false;
      });
    });
  }

  bool _matches(String text) =>
      _query.isEmpty || text.toLowerCase().contains(_query);

  void _select(DestinationResult result) {
    HapticFeedback.selectionClick();
    widget.onDestinationSelected(result);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final frequentAsync = ref.watch(frequentAddressesProvider);
    final recentAsync = ref.watch(recentDestinationsProvider);
    final poisAsync = ref.watch(placePoisProvider);

    return Material(
      color: theme.colorScheme.surface,
      elevation: 16,
      shadowColor: Colors.black.withValues(alpha: 0.4),
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ----------------------------------------------------------------
          // Drag handle
          // ----------------------------------------------------------------
          Center(
            child: Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              decoration: BoxDecoration(
                color: theme.colorScheme.outline.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // ----------------------------------------------------------------
          // Title row + close button
          // ----------------------------------------------------------------
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 8, 0),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    '¿A dónde vamos?',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  tooltip: 'Cerrar',
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          // ----------------------------------------------------------------
          // Search field
          // ----------------------------------------------------------------
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
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
                          _focusNode.requestFocus();
                        },
                      )
                    : null,
              ),
            ),
          ),

          // ----------------------------------------------------------------
          // Results list — receives the DraggableScrollableSheet's controller
          // so dragging the list at the top edge drags the sheet itself.
          // ----------------------------------------------------------------
          Expanded(
            child: ListView(
              controller: widget.scrollController,
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                _PlacesSection(
                  query: _debouncedQuery,
                  isTyping: _isTyping,
                  bias: widget.currentLocation,
                  onSelect: _select,
                ),
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
      loading: () => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SectionHeader('Frecuentes'),
          SectionSkeleton(count: 2),
        ],
      ),
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
      loading: () => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SectionHeader('Recientes'),
          SectionSkeleton(count: 3),
        ],
      ),
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
      loading: () => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SectionHeader('Sugerencias del pueblo'),
          SectionSkeleton(count: 3),
        ],
      ),
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
// Google Places suggestions (live)
// ---------------------------------------------------------------------------

class _PlacesSection extends ConsumerWidget {
  const _PlacesSection({
    required this.query,
    required this.isTyping,
    required this.bias,
    required this.onSelect,
  });

  final String query;
  final bool isTyping;
  final LatLng? bias;
  final void Function(DestinationResult) onSelect;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Show skeletons while the user is typing (before debounce fires) so the
    // UI feels instantly responsive.
    if (isTyping && query.trim().length < 2) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SectionHeader('Sugerencias'),
          SectionSkeleton(count: 4),
        ],
      );
    }
    if (query.trim().length < 2) return const SizedBox.shrink();
    final async = ref.watch(
      placePredictionsProvider((query: query, bias: bias)),
    );
    return async.when(
      loading: () => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          _SectionHeader('Sugerencias'),
          SectionSkeleton(count: 4),
        ],
      ),
      error: (e, _) => Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Text(
          e is PlacesException && e.status == 'HTTP_403'
              ? 'No se pudieron cargar sugerencias.'
              : 'Sin conexión.',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
      data: (predictions) {
        if (predictions.isEmpty) return const SizedBox.shrink();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeader('Sugerencias'),
            ...predictions.map((p) => _PredictionTile(
                  prediction: p,
                  query: query,
                  onTap: () => _resolveAndSelect(ref, p),
                )),
          ],
        );
      },
    );
  }

  Future<void> _resolveAndSelect(WidgetRef ref, PlacePrediction p) async {
    try {
      final loc = await ref.read(placesServiceProvider).details(p.placeId);
      onSelect(DestinationResult(
        label: p.mainText,
        address: p.description.isNotEmpty ? p.description : p.mainText,
        location: loc,
      ));
    } catch (_) {
      // Swallow — surface a snackbar in caller if desired.
    }
  }
}

class _PredictionTile extends StatelessWidget {
  const _PredictionTile({
    required this.prediction,
    required this.query,
    required this.onTap,
  });

  final PlacePrediction prediction;
  final String query;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return ListTile(
      leading: Icon(Icons.place_outlined, color: theme.colorScheme.primary),
      title: _highlight(prediction.mainText, query, theme),
      subtitle: Text(
        prediction.secondaryText,
        style: theme.textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.onSurfaceVariant,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      onTap: onTap,
    );
  }

  Widget _highlight(String text, String q, ThemeData theme) {
    if (q.isEmpty) return Text(text, style: theme.textTheme.bodyLarge);
    final lower = text.toLowerCase();
    final i = lower.indexOf(q.toLowerCase());
    if (i < 0) return Text(text, style: theme.textTheme.bodyLarge);
    return RichText(
      text: TextSpan(
        style: theme.textTheme.bodyLarge,
        children: [
          TextSpan(text: text.substring(0, i)),
          TextSpan(
            text: text.substring(i, i + q.length),
            style: TextStyle(
              color: theme.colorScheme.primary,
              fontWeight: FontWeight.w700,
            ),
          ),
          TextSpan(text: text.substring(i + q.length)),
        ],
      ),
    );
  }
}

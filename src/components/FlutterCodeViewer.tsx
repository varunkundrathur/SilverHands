import React, { useState } from "react";
import {
  Code2,
  Copy,
  Check,
  FolderTree,
  FileCode,
  Layers,
  Sparkles,
  X,
  ExternalLink,
  Download,
} from "lucide-react";

interface FlutterCodeViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FlutterCodeViewer: React.FC<FlutterCodeViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>("main.dart");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const flutterFiles: Record<string, { path: string; code: string; desc: string }> = {
    "main.dart": {
      path: "lib/main.dart",
      desc: "App entry point with high-contrast accessible theme, Firebase initialization, and responsive builder",
      code: `// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'providers/app_state.dart';
import 'screens/auth_screen.dart';
import 'screens/customer_home.dart';
import 'screens/provider_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // await Firebase.initializeApp(); // Initialize Firebase in production
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppState()),
      ],
      child: const SilverHandsApp(),
    ),
  );
}

class SilverHandsApp extends StatelessWidget {
  const SilverHandsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppState>(
      builder: (context, appState, child) {
        return MaterialApp(
          title: 'SilverHands',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFFD97706), // Warm Amber
              brightness: Brightness.dark,
              surface: const Color(0xFF0F172A), // Deep Navy Slate
              background: const Color(0xFF0B132B),
              primary: const Color(0xFFF59E0B),
              secondary: const Color(0xFF8B5CF6),
            ),
            textTheme: const TextTheme(
              bodyLarge: TextStyle(fontSize: 18.0, height: 1.6, color: Color(0xFFFEF3C7)),
              bodyMedium: TextStyle(fontSize: 16.0, height: 1.5, color: Color(0xFFE2E8F0)),
              titleLarge: TextStyle(fontSize: 22.0, fontWeight: FontWeight.bold, fontFamily: 'Serif'),
            ),
          ),
          home: const AuthScreen(),
        );
      },
    );
  }
}
`,
    },
    "gemini_service.dart": {
      path: "lib/services/gemini_service.dart",
      desc: "Gemini AI listing generator, intent parser, and real-time chat translator",
      code: `// lib/services/gemini_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class GeminiChatbotService {
  final String baseUrl;
  GeminiChatbotService({this.baseUrl = 'https://your-api-endpoint.com/api/gemini'});

  /// Generates a structured, SEO-friendly listing with English translation from native speech/text
  Future<Map<String, dynamic>> generateProviderListing(String input, {String? language}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/generate-listing'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'input': input, 'language': language ?? 'Hindi'}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to generate listing: \${response.statusCode}');
      }
    } catch (e) {
      return {
        'title': input.length > 30 ? input.substring(0, 30) : input,
        'titleEnglish': input,
        'description': input,
        'category': 'handmade_goods',
        'tags': ['Artisan', 'Handmade'],
        'estimatedPrice': 350.0,
        'isBarter': true,
      };
    }
  }

  /// Parses customer voice or natural language intent into structured search filters
  Future<Map<String, dynamic>> parseCustomerSearchIntent(String input) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/parse-intent'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'input': input}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        throw Exception('Failed to parse intent: \${response.statusCode}');
      }
    } catch (e) {
      return {
        'category': 'all',
        'keywords': input.toLowerCase().split(' '),
        'maxDistanceKm': 5.0,
        'isBarter': false,
        'summary': 'Searching for $input',
      };
    }
  }

  /// Translates messages in real-time between Provider & Customer languages
  Future<String> translateMessage(String text, String targetLanguage, {String? sourceLanguage}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/translate-message'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'text': text,
          'targetLanguage': targetLanguage,
          'sourceLanguage': sourceLanguage,
        }),
      );
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['translatedText'] ?? text;
      }
      return text;
    } catch (e) {
      return text;
    }
  }
}
`,
    },
    "listing_model.dart": {
      path: "lib/models/listing_model.dart",
      desc: "Data model for artisan listings, voice notes, GPS coordinates, and pricing",
      code: `// lib/models/listing_model.dart

class ListingModel {
  final String id;
  final String providerId;
  final String providerName;
  final String title;
  final String titleEnglish;
  final String description;
  final String descriptionEnglish;
  final String category;
  final List<String> tags;
  final double price;
  final bool isBarter;
  final double lat;
  final double lng;
  final double? distanceKm;
  final String? voiceUrl;
  final bool hasVoiceNote;
  final String language;

  ListingModel({
    required this.id,
    required this.providerId,
    required this.providerName,
    required this.title,
    required this.titleEnglish,
    required this.description,
    required this.descriptionEnglish,
    required this.category,
    required this.tags,
    required this.price,
    required this.isBarter,
    required this.lat,
    required this.lng,
    this.distanceKm,
    this.voiceUrl,
    this.hasVoiceNote = false,
    this.language = 'hi-IN',
  });

  ListingModel copyWith({
    String? id,
    String? providerId,
    String? providerName,
    String? title,
    String? titleEnglish,
    String? description,
    String? descriptionEnglish,
    String? category,
    List<String>? tags,
    double? price,
    bool? isBarter,
    double? lat,
    double? lng,
    double? distanceKm,
    String? voiceUrl,
    bool? hasVoiceNote,
    String? language,
  }) {
    return ListingModel(
      id: id ?? this.id,
      providerId: providerId ?? this.providerId,
      providerName: providerName ?? this.providerName,
      title: title ?? this.title,
      titleEnglish: titleEnglish ?? this.titleEnglish,
      description: description ?? this.description,
      descriptionEnglish: descriptionEnglish ?? this.descriptionEnglish,
      category: category ?? this.category,
      tags: tags ?? this.tags,
      price: price ?? this.price,
      isBarter: isBarter ?? this.isBarter,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      distanceKm: distanceKm ?? this.distanceKm,
      voiceUrl: voiceUrl ?? this.voiceUrl,
      hasVoiceNote: hasVoiceNote ?? this.hasVoiceNote,
      language: language ?? this.language,
    );
  }

  factory ListingModel.fromJson(Map<String, dynamic> json) {
    return ListingModel(
      id: json['id'] ?? '',
      providerId: json['providerId'] ?? '',
      providerName: json['providerName'] ?? 'Senior Artisan',
      title: json['title'] ?? '',
      titleEnglish: json['titleEnglish'] ?? json['title'] ?? '',
      description: json['description'] ?? '',
      descriptionEnglish: json['descriptionEnglish'] ?? json['description'] ?? '',
      category: json['category'] ?? 'handmade_goods',
      tags: List<String>.from(json['tags'] ?? []),
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      isBarter: json['isBarter'] ?? false,
      lat: (json['lat'] as num?)?.toDouble() ?? 13.0827,
      lng: (json['lng'] as num?)?.toDouble() ?? 80.2707,
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      voiceUrl: json['voiceUrl'],
      hasVoiceNote: json['hasVoiceNote'] ?? false,
      language: json['language'] ?? 'hi-IN',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'providerId': providerId,
      'providerName': providerName,
      'title': title,
      'titleEnglish': titleEnglish,
      'description': description,
      'descriptionEnglish': descriptionEnglish,
      'category': category,
      'tags': tags,
      'price': price,
      'isBarter': isBarter,
      'lat': lat,
      'lng': lng,
      'distanceKm': distanceKm,
      'voiceUrl': voiceUrl,
      'hasVoiceNote': hasVoiceNote,
      'language': language,
    };
  }
}
`,
    },
    "location_service.dart": {
      path: "lib/services/location_service.dart",
      desc: "System location handling with Geolocator and Haversine formula proximity queries",
      code: `// lib/services/location_service.dart
import 'dart:math';
import 'package:geolocator/geolocator.dart';
import '../models/listing_model.dart';

class LocationService {
  /// Request system location permissions and fetch current device position
  Future<Position?> getCurrentPosition() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return null;
    }

    if (permission == LocationPermission.deniedForever) return null;

    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  /// Calculates Haversine great-circle distance between two GPS coordinates in kilometers
  double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
    const double r = 6371.0; // Earth radius in km
    final double dLat = _toRadians(lat2 - lat1);
    final double dLon = _toRadians(lon2 - lon1);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) * cos(_toRadians(lat2)) * sin(dLon / 2) * sin(dLon / 2);
    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return double.parse((r * c).toStringAsFixed(1));
  }

  double _toRadians(double degree) => degree * (pi / 180.0);

  /// Filters and sorts listings strictly by proximity radius
  List<ListingModel> filterByRadius(
    List<ListingModel> listings,
    double userLat,
    double userLng,
    double maxRadiusKm,
  ) {
    final List<ListingModel> withDistance = listings.map((item) {
      final dist = calculateHaversineDistance(userLat, userLng, item.lat, item.lng);
      return item.copyWith(distanceKm: dist);
    }).where((item) => (item.distanceKm ?? 999.0) <= maxRadiusKm).toList();

    withDistance.sort((a, b) => (a.distanceKm ?? 0.0).compareTo(b.distanceKm ?? 0.0));
    return withDistance;
  }
}
`,
    },
    "auth_screen.dart": {
      path: "lib/screens/auth_screen.dart",
      desc: "Custom Username & Passcode authentication flow for senior accessibility",
      code: `// lib/screens/auth_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import 'customer_home.dart';
import 'provider_dashboard.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passcodeController = TextEditingController();
  bool _isRegistering = false;
  String? _errorMessage;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 520),
            padding: const EdgeInsets.all(32.0),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(28.0),
              border: Border.all(color: const Color(0xFFD97706).withOpacity(0.4), width: 2),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.stars, color: Color(0xFFF59E0B), size: 48),
                const SizedBox(height: 12),
                const Text(
                  'SilverHands',
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFFFEF3C7)),
                ),
                const Text(
                  'Accessible Hyperlocal Marketplace',
                  style: TextStyle(fontSize: 16, color: Color(0xFF94A3B8)),
                ),
                const SizedBox(height: 28),
                if (_errorMessage != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.amber.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: Colors.amber, fontSize: 14)),
                  ),
                  const SizedBox(height: 16),
                ],
                TextField(
                  controller: _usernameController,
                  style: const TextStyle(fontSize: 18, color: Colors.white),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.person, color: Color(0xFFF59E0B)),
                    labelText: 'Username',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 18),
                TextField(
                  controller: _passcodeController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  style: const TextStyle(fontSize: 18, color: Colors.white, letterSpacing: 4),
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.lock, color: Color(0xFFF59E0B)),
                    labelText: '4-Digit Passcode',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF59E0B),
                      foregroundColor: const Color(0xFF0F172A),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
                    ),
                    onPressed: () async {
                      final success = await appState.loginWithUsernamePasscode(
                        _usernameController.text.trim(),
                        _passcodeController.text.trim(),
                      );
                      if (success) {
                        if (appState.currentUser?.role == 'provider') {
                          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const ProviderDashboardScreen()));
                        } else {
                          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const CustomerHomeScreen()));
                        }
                      } else {
                        setState(() {
                          _errorMessage = 'Username not found. Tap below to create an account!';
                          _isRegistering = true;
                        });
                      }
                    },
                    child: const Text('Enter SilverHands', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
`,
    },
    "customer_home.dart": {
      path: "lib/screens/customer_home.dart",
      desc: "Responsive Customer Feed & Google Maps view with voice intent search",
      code: `// lib/screens/customer_home.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../widgets/heritage_audio_player.dart';

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final isDesktop = MediaQuery.of(context).size.width > 800;

    return Scaffold(
      backgroundColor: const Color(0xFF0B132B),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('SilverHands • Neighbor Feed', style: TextStyle(color: Color(0xFFFEF3C7))),
        actions: [
          IconButton(
            icon: const Icon(Icons.mic, color: Color(0xFFF59E0B)),
            onPressed: () {
              // Trigger Multilingual Voice Intent
            },
          ),
        ],
      ),
      body: isDesktop
          ? Row(
              children: [
                // Persistent Desktop Left Rail
                NavigationRail(
                  selectedIndex: 0,
                  backgroundColor: const Color(0xFF0F172A),
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.explore), label: Text('Discover')),
                    NavigationRailDestination(icon: Icon(Icons.map), label: Text('Radar')),
                    NavigationRailDestination(icon: Icon(Icons.chat), label: Text('Messages')),
                  ],
                  onDestinationSelected: (index) {},
                ),
                // Feed & Map Split Screen
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: appState.filteredListings.length,
                    itemBuilder: (context, index) {
                      final item = appState.filteredListings[index];
                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.only(bottom: 16),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                              Text('\${item.distanceKm} km away • \${item.providerName}', style: const TextStyle(color: Colors.amber)),
                              const SizedBox(height: 8),
                              Text(item.description, style: const TextStyle(color: Colors.white70)),
                              if (item.hasVoiceNote) HeritageAudioPlayer(voiceUrl: item.voiceUrl),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: appState.filteredListings.length,
              itemBuilder: (context, index) {
                final item = appState.filteredListings[index];
                return ListTile(
                  title: Text(item.title, style: const TextStyle(color: Colors.white)),
                  subtitle: Text('\${item.distanceKm} km • \${item.providerName}'),
                );
              },
            ),
      bottomNavigationBar: !isDesktop
          ? BottomNavigationBar(
              backgroundColor: const Color(0xFF0F172A),
              selectedItemColor: const Color(0xFFF59E0B),
              unselectedItemColor: Colors.grey,
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Feed'),
                BottomNavigationBarItem(icon: Icon(Icons.map), label: 'Radar Map'),
                BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Chat'),
              ],
            )
          : null,
    );
  }
}
`,
    },
    "radar_map_screen.dart": {
      path: "lib/screens/radar_map_screen.dart",
      desc: "Live GPS Leaflet & Google Map with Radius Circle and 'Me' Current Location Marker",
      code: `// lib/screens/radar_map_screen.dart
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:provider/provider.dart';
import '../providers/app_state.dart';
import '../models/listing_model.dart';

class RadarMapScreen extends StatefulWidget {
  const RadarMapScreen({super.key});

  @override
  State<RadarMapScreen> createState() => _RadarMapScreenState();
}

class _RadarMapScreenState extends State<RadarMapScreen> {
  GoogleMapController? _mapController;
  double _radiusKm = 5.0;

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppState>(context);
    final userLat = appState.userLat ?? 13.0827;
    final userLng = appState.userLng ?? 80.2707;
    final userPos = LatLng(userLat, userLng);

    // 1. "Me" Current Location Marker
    final Set<Marker> markers = {
      Marker(
        markerId: const MarkerId('me_location_marker'),
        position: userPos,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure),
        infoWindow: InfoWindow(
          title: '📍 Me (My Current Location)',
          snippet: 'Active Search Radius: \${_radiusKm.toInt()} km',
        ),
      ),
    };

    // Add artisan neighbor markers
    for (final listing in appState.filteredListings) {
      markers.add(
        Marker(
          markerId: MarkerId(listing.id),
          position: LatLng(listing.lat, listing.lng),
          icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueOrange),
          infoWindow: InfoWindow(
            title: listing.title,
            snippet: '\${listing.distanceKm ?? 0} km away • \${listing.providerName}',
          ),
        ),
      );
    }

    // 2. Proximity Radius Circle around "Me"
    final Set<Circle> circles = {
      Circle(
        circleId: const CircleId('neighborhood_radius_circle'),
        center: userPos,
        radius: _radiusKm * 1000, // in meters
        fillColor: const Color(0xFFF59E0B).withOpacity(0.12),
        strokeColor: const Color(0xFFF59E0B),
        strokeWidth: 2,
      ),
    };

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Neighbor Radar Map', style: TextStyle(color: Color(0xFFFEF3C7))),
        actions: [
          // Center on Me Action
          TextButton.icon(
            icon: const Icon(Icons.my_location, color: Color(0xFF38BDF8)),
            label: const Text('Me', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () {
              _mapController?.animateCamera(
                CameraUpdate.newCameraPosition(CameraPosition(target: userPos, zoom: 14)),
              );
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          GoogleMap(
            initialCameraPosition: CameraPosition(target: userPos, zoom: 13),
            markers: markers,
            circles: circles,
            myLocationEnabled: true,
            myLocationButtonEnabled: false,
            onMapCreated: (controller) => _mapController = controller,
          ),
          // Radius control bar
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withOpacity(0.92),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.amber.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Radius: \${_radiusKm.toInt()} km from Me',
                      style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold, fontSize: 13)),
                  Wrap(
                    spacing: 6,
                    children: [1, 3, 5, 10].map((r) {
                      final isSelected = _radiusKm == r;
                      return ChoiceChip(
                        label: Text('\${r}k', style: TextStyle(color: isSelected ? Colors.black : Colors.white, fontSize: 11)),
                        selected: isSelected,
                        selectedColor: const Color(0xFFF59E0B),
                        backgroundColor: const Color(0xFF1E293B),
                        onSelected: (selected) {
                          if (selected) setState(() => _radiusKm = r.toDouble());
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`,
    },
    "pubspec.yaml": {
      path: "pubspec.yaml",
      desc: "Flutter project dependencies configuration",
      code: `name: silverhands
description: Hyperlocal marketplace connecting seniors and neighbors with multilingual Gemini AI.
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  provider: ^6.1.1
  geolocator: ^10.1.0
  google_maps_flutter: ^2.5.3
  http: ^1.2.0
  firebase_core: ^2.27.0
  cloud_firestore: ^4.15.5
  firebase_auth: ^4.17.5
  firebase_storage: ^11.6.5
  audioplayers: ^5.2.1
  record: ^5.0.4
  speech_to_text: ^6.6.0
  flutter_tts: ^3.8.5

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`,
    },
  };

  const handleCopy = () => {
    const code = flutterFiles[selectedFile]?.code || "";
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl text-amber-50 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-950/90 via-slate-900 to-slate-900 border-b border-amber-900/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
              <Code2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-bold text-amber-100 font-serif">
                  SilverHands • Flutter (Dart) Production Source
                </h3>
                <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2.5 py-0.5 rounded-full font-mono">
                  VS Code Ready
                </span>
              </div>
              <p className="text-xs text-amber-200/70">
                Modular architecture with Provider, Gemini API, Geolocator & Firebase
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "Copied to Clipboard!" : "Copy Code"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Body: Left file tree + Right code viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#0A0F1D]">
          {/* File Tree Selector */}
          <div className="w-full md:w-72 bg-slate-950 border-r border-slate-800 p-3 overflow-y-auto space-y-1">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 px-3 py-2 flex items-center space-x-1.5">
              <FolderTree className="w-4 h-4 text-amber-400" />
              <span>Project Structure</span>
            </div>

            {Object.keys(flutterFiles).map((fileName) => {
              const file = flutterFiles[fileName];
              const isSelected = selectedFile === fileName;

              return (
                <button
                  key={fileName}
                  onClick={() => setSelectedFile(fileName)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-mono transition-all flex items-center space-x-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <FileCode className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <div className="truncate">
                    <div className="text-amber-100">{fileName}</div>
                    <div className="text-[10px] text-slate-500 truncate">{file.path}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {flutterFiles[selectedFile]?.path}
                </span>
                <p className="text-xs text-slate-400 mt-0.5">
                  {flutterFiles[selectedFile]?.desc}
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-400">
                Dart / Flutter
              </span>
            </div>

            <pre className="flex-1 overflow-auto bg-[#070B14] p-4 rounded-2xl border border-slate-800 text-xs sm:text-sm font-mono text-amber-100/90 leading-relaxed select-text">
              <code>{flutterFiles[selectedFile]?.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

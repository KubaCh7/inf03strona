-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Paź 25, 2024 at 07:29 PM
-- Wersja serwera: 10.4.32-MariaDB
-- Wersja PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `rowery`
--

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `producenci`
--

CREATE TABLE `producenci` (
  `id` int(11) NOT NULL,
  `nazwa` varchar(255) NOT NULL,
  `kraj` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `producenci`
--

INSERT INTO `producenci` (`id`, `nazwa`, `kraj`) VALUES
(1, 'Cup', 'USA'),
(2, 'Knife', 'USA'),
(3, 'Glass', 'Tajwan'),
(4, 'Teaspoon', 'USA'),
(5, 'Spoon', 'Niemcy'),
(6, 'Fork', 'Tajwan');

-- --------------------------------------------------------

--
-- Struktura tabeli dla tabeli `rowery`
--

CREATE TABLE `rowery` (
  `id` int(11) NOT NULL,
  `model` varchar(255) NOT NULL,
  `producent_id` int(11) NOT NULL,
  `typ` varchar(100) NOT NULL,
  `rozmiar_ramy` varchar(50) DEFAULT NULL,
  `rozmiar_kol` varchar(50) DEFAULT NULL,
  `kolor` varchar(50) DEFAULT NULL,
  `cena` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `rowery`
--

INSERT INTO `rowery` (`id`, `model`, `producent_id`, `typ`, `rozmiar_ramy`, `rozmiar_kol`, `kolor`, `cena`) VALUES
(1, 'Synapse Carbon Ultegra', 4, 'szosowy', '56 cm', '28', 'czarny', 22000.00),
(2, 'Scalpel Carbon 3', 4, 'górski', 'M', '29', 'zielony', 28000.00),
(3, 'Trail 4', 4, 'górski', 'L', '29', 'niebieski', 6000.00),
(4, 'CAAD13 45', 4, 'szosowy', '54 cm', '28', 'czerwony', 4000.00),
(5, 'F-Si Carbon 2', 4, 'górski', 'L', '29', 'czarny', 18000.00),
(6, 'Topstone Carbon Ultegra RX', 4, 'gravel', 'M', '28', 'żółty', 12750.00),
(7, 'Jekyll Carbon 29 1', 4, 'górski', 'L', '29', 'niebieski', 32000.00),
(8, 'SystemSix Carbon Ultegra', 4, 'szosowy', '56 cm', '28', 'czarny', 30000.00),
(9, 'Scalpel-Si Carbon 4', 4, 'górski', 'M', '29', 'czerwony', 23000.00),
(10, 'Cujo Neo 130', 4, 'elektryczny', 'L', '29', 'zielony', 25000.00),
(11, 'SuperSix EVO Carbon 45', 4, 'szosowy', '54 cm', '28', 'czarny', 12000.00),
(12, 'Trail Neo 1', 4, 'elektryczny', 'M', '29', 'czerwony', 16000.00),
(13, 'Topstone Carbon Lefty 3', 4, 'gravel', 'L', '28', 'zielony', 14250.00),
(14, 'Scalpel-Si Carbon 3', 4, 'górski', 'M', '29', 'czarny', 20000.00),
(15, 'CAAD Optimo Tiagra', 4, 'szosowy', '56 cm', '28', 'niebieski', 6000.00),
(16, 'Habit Carbon 3', 4, 'górski', 'L', '29', 'czarny', 14000.00),
(17, 'Quick CX 1', 4, 'miejski', 'M', '28', 'szary', 4500.00),
(18, 'Topstone Neo Carbon 2', 4, 'elektryczny', 'L', '28', 'czarny', 20400.00),
(19, 'Scalpel Carbon SE 2', 4, 'górski', 'M', '29', 'czerwony', 18000.00),
(20, 'Tarmac SL7 Expert', 2, 'szosowy', '56 cm', '28', 'czarny', 24000.00),
(21, 'Stumpjumper Expert', 2, 'górski', 'M', '22', 'zielony', 28000.00),
(22, 'Rockhopper Expert 22', 2, 'górski', 'L', '22', 'niebieski', 8000.00),
(23, 'Roubaix Comp', 2, 'szosowy', '54 cm', '28', 'czerwony', 16000.00),
(24, 'Enduro Expert', 2, 'górski', 'L', '22', 'czarny', 32000.00),
(25, 'Fuse Comp 22', 2, 'górski', 'M', '22', 'żółty', 2000.00),
(26, 'Epic Expert', 2, 'górski', 'L', '22', 'niebieski', 30000.00),
(27, 'Diverge Comp', 2, 'szosowy', '56 cm', '28', 'czarny', 17000.00),
(28, 'Chisel Expert', 2, 'górski', 'M', '22', 'czerwony', 12000.00),
(29, 'Sirrus X Comp Carbon', 2, 'miejski', 'L', '28', 'szary', 11000.00),
(30, 'Turbo Levo Comp', 2, 'elektryczny', 'L', '22', 'zielony', 28000.00),
(31, 'Allez Sprint Comp', 2, 'szosowy', '54 cm', '28', 'czarny', 14000.00),
(32, 'Kenevo Expert', 2, 'elektryczny', 'M', '27.5', 'czerwony', 35000.00),
(33, 'Chisel Comp', 2, 'górski', 'L', '22', 'zielony', 10000.00),
(34, 'Rockhopper Pro 22', 2, 'górski', 'M', '22', 'niebieski', 6000.00),
(35, 'Turbo Vado SL 4.0', 2, 'elektryczny', 'L', '28', 'czarny', 15000.00),
(36, 'Enduro Comp', 2, 'górski', 'L', '22', 'czerwony', 23000.00),
(37, 'Stumpjumper EVO Comp', 2, 'górski', 'M', '22', 'czarny', 20000.00),
(38, 'Rockhopper Expert', 2, 'górski', 'L', '22', 'zielony', 8500.00),
(39, 'Turbo Creo SL Comp Carbon', 2, 'szosowy', '56 cm', '28', 'biały', 22000.00),
(40, 'Epic EVO Expert', 2, 'górski', 'L', '22', 'czerwony', 26000.00),
(41, 'Sirrus X 5.0', 2, 'miejski', 'M', '28', 'czarny', 8000.00),
(42, 'Turbo Levo SL Comp', 2, 'elektryczny', 'L', '22', 'niebieski', 26000.00),
(43, 'Roubaix Sport', 2, 'szosowy', '54 cm', '28', 'czerwony', 12000.00),
(44, 'Rockhopper Elite 22', 2, 'górski', 'L', '22', 'zielony', 5000.00),
(45, 'Turbo Como 4.0', 2, 'elektryczny', 'M', '28', 'czarny', 10000.00),
(46, 'Enduro Comp 22', 2, 'górski', 'L', '22', 'czerwony', 22000.00),
(47, 'Stumpjumper Comp', 2, 'górski', 'M', '22', 'niebieski', 18000.00),
(48, 'Rockhopper Comp 22', 2, 'górski', 'L', '22', 'szary', 4000.00),
(49, 'Turbo Vado 4.0', 2, 'elektryczny', 'L', '28', 'zielony', 13000.00),
(50, 'Epic Comp', 2, 'górski', 'M', '22', 'czarny', 14000.00),
(51, 'Sirrus 4.0', 2, 'miejski', 'L', '28', 'niebieski', 6000.00),
(52, 'Turbo Levo Comp Carbon', 2, 'elektryczny', 'L', '22', 'czerwony', 32000.00),
(53, 'Scultura 4000', 6, 'szosowy', '56 cm', '28', 'czarny', 12500.00),
(54, 'Big Nine 300', 6, 'górski', 'M', '29', 'niebieski', 6500.00),
(55, 'One-Twenty 6000', 6, 'górski', 'L', '29', 'zielony', 18500.00),
(56, 'Reacto 5000', 6, 'szosowy', '54 cm', '28', 'czerwony', 16000.00),
(57, 'Big Seven 500', 6, 'górski', 'M', '27.5', 'czarny', 5500.00),
(58, 'Big Nine 600', 6, 'górski', 'L', '29', 'czerwony', 8500.00),
(59, 'Scultura 7000-E', 6, 'szosowy', '56 cm', '28', 'niebieski', 23000.00),
(60, 'One-Forty 600', 6, 'górski', 'M', '27.5', 'zielony', 12000.00),
(61, 'Reacto 4000', 6, 'szosowy', '54 cm', '28', 'czarny', 14500.00),
(62, 'Big Seven 100', 6, 'górski', 'M', '27.5', 'biały', 4000.00),
(63, 'eBig Nine 400', 6, 'elektryczny', 'M', '29', 'czarny', 16000.00),
(64, 'Silex+ 6000', 6, 'gravel', 'L', '28', 'szary', 12750.00),
(65, 'Mission CX 8000', 6, 'cross', '54 cm', '28', 'zielony', 19000.00),
(66, 'eOne-Twenty 9000', 6, 'elektryczny', 'L', '29', 'czerwony', 29000.00),
(67, 'Scultura Disc 6000', 6, 'szosowy', '56 cm', '28', 'niebieski', 18000.00),
(68, 'Big Nine XT-Edition', 6, 'górski', 'L', '29', 'czarny', 10500.00),
(69, 'Reacto Disc Team-E', 6, 'szosowy', '54 cm', '28', 'czerwony', 25000.00),
(70, 'Big Seven 300', 6, 'górski', 'M', '27.5', 'niebieski', 6000.00),
(71, 'eSpresso 400 EQ', 6, 'miejski', 'M', '28', 'czarny', 9000.00),
(72, 'Crossway Urban 500', 6, 'miejski', 'L', '28', 'zielony', 7000.00),
(73, 'TCR Advanced Pro 1', 3, 'szosowy', '56 cm', '23', 'czarny', 19000.00),
(74, 'Anthem Advanced Pro 29 0', 3, 'górski', 'M', '29', 'zielony', 27000.00),
(75, 'Talon 2', 3, 'górski', 'L', '29', 'niebieski', 3500.00),
(76, 'Defy Advanced Pro 1', 3, 'szosowy', '54 cm', '23', 'czerwony', 16000.00),
(77, 'Trance X Advanced Pro 29 1', 3, 'górski', 'L', '29', 'czarny', 23000.00),
(78, 'Fathom 29 2', 3, 'górski', 'M', '29', 'żółty', 6000.00),
(79, 'Reign Advanced Pro 29 0', 3, 'górski', 'L', '29', 'niebieski', 32000.00),
(80, 'Propel Advanced SL Disc', 3, 'szosowy', '56 cm', '23', 'czarny', 33000.00),
(81, 'XTC Advanced SL 29 0', 3, 'górski', 'M', '29', 'czerwony', 19000.00),
(82, 'Stance 29 1', 3, 'górski', 'L', '29', 'zielony', 3000.00),
(83, 'Escape 3 Disc', 3, 'miejski', 'L', '23', 'czarny', 2500.00),
(84, 'FastRoad E+ EX Pro', 3, 'elektryczny', 'M', '23', 'szary', 9000.00),
(85, 'Trance 29 3', 3, 'górski', 'M', '29', 'zielony', 12000.00),
(86, 'Talon 1', 3, 'górski', 'L', '29', 'czarny', 5000.00),
(87, 'ToughRoad SLR GX 1', 3, 'gravel', 'M', '23', 'czerwony', 5250.00),
(88, 'Talon E+ 1', 3, 'elektryczny', 'L', '29', 'zielony', 12000.00),
(89, 'Trance X Advanced Pro 29 2', 3, 'górski', 'L', '29', 'czarny', 25000.00),
(90, 'TCR Advanced Pro Disc', 3, 'szosowy', '54 cm', '23', 'niebieski', 13000.00),
(91, 'Anthem Advanced Pro 29 1', 3, 'górski', 'M', '29', 'czarny', 23000.00),
(92, 'Talon 29 0', 3, 'górski', 'L', '29', 'czerwony', 4000.00),
(93, 'XtC Advanced 29 1', 3, 'górski', 'M', '29', 'zielony', 10000.00),
(94, 'Revolt Advanced 2', 3, 'gravel', 'L', '23', 'szary', 2250.00),
(95, 'Stance E+ 2', 3, 'elektryczny', 'M', '27.5', 'czarny', 10000.00),
(96, 'Fathom E+ 2', 3, 'elektryczny', 'L', '29', 'niebieski', 3500.00),
(97, 'TCR Advanced SL 0 Disc', 3, 'szosowy', '56 cm', '23', 'czarny', 23000.00),
(98, 'Anthem Advanced 29 2', 3, 'górski', 'M', '29', 'czerwony', 11000.00),
(99, 'Reign E+ 1 Pro', 3, 'elektryczny', 'L', '29', 'zielony', 23000.00),
(100, 'XtC Advanced SL 29 0', 3, 'górski', 'M', '29', 'czarny', 22000.00),
(101, 'Fathom 29 1', 3, 'górski', 'L', '29', 'niebieski', 7500.00),
(102, 'Trance X Advanced Pro 29 0', 3, 'górski', 'L', '29', 'czerwony', 30000.00),
(103, 'Escape Disc', 3, 'miejski', 'M', '23', 'szary', 3000.00),
(104, 'Strive CFR 9.0', 5, 'górski', 'M', '29', 'czerwony', 30000.00),
(105, 'Spectral CFR 9.0', 5, 'górski', 'L', '29', 'zielony', 32000.00),
(106, 'Lux CF 8.0', 5, 'górski', 'M', '29', 'czarny', 22000.00),
(107, 'Exceed CFR LTD', 5, 'górski', 'L', '29', 'niebieski', 28000.00),
(108, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(109, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(110, 'Aeroad CFR Disc Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(111, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(112, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(113, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(114, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(115, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(116, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(117, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(118, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(119, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(120, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(121, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(122, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(123, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(124, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(125, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(126, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(127, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(128, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(129, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(130, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(131, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(132, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(133, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(134, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(135, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(136, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(137, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(138, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(139, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(140, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(141, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(142, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(143, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(144, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(145, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(146, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(147, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(148, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(149, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(150, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(151, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(152, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(153, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(154, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(155, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(156, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(157, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(158, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(159, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(160, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(161, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(162, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(163, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(164, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(165, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(166, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(167, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(168, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(169, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(170, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(171, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(172, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(173, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(174, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(175, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(176, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(177, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(178, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(179, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(180, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(181, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(182, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(183, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(184, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(185, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(186, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(187, 'Stoic 4', 5, 'górski', 'L', '29', 'zielony', 12000.00),
(188, 'Aeroad CF SLX Disc 9.0 Di2', 5, 'szosowy', '56 cm', '28', 'czarny', 38000.00),
(189, 'Endurace CF SL Disc 8.0', 5, 'szosowy', '54 cm', '28', 'niebieski', 26000.00),
(190, 'Grail CF SLX 8.0 Di2', 5, 'szosowy', '58 cm', '28', 'zielony', 30000.00),
(191, 'Ultimate CF SLX 8.0 Di2', 5, 'szosowy', 'M', '29', 'czarny', 32000.00),
(192, 'Lux CF SL 6.0', 5, 'górski', 'L', '29', 'niebieski', 18000.00),
(193, 'Spectral CF 7.0', 5, 'górski', 'M', '29', 'czerwony', 21000.00),
(194, 'Neuron CF 9.0 SL', 5, 'górski', 'L', '29', 'zielony', 28000.00),
(195, 'Sender AL 7.0', 5, 'górski', 'M', '29', 'czarny', 24000.00),
(196, 'Strive CF 8.0', 5, 'górski', 'L', '29', 'niebieski', 26000.00),
(197, 'Spectral CF 9.0', 5, 'górski', 'M', '29', 'zielony', 30000.00),
(198, 'Exceed CF 8.0', 5, 'górski', 'L', '29', 'czarny', 18000.00),
(199, 'Torque CF 9.0', 5, 'górski', 'M', '29', 'czerwony', 34000.00),
(200, 'Domane SL 6', 1, 'szosowy', '56 cm', '28', 'czarny', 18000.00),
(201, 'Top Fuel 9.8 GX', 1, 'górski', 'M', '29', 'zielony', 24000.00),
(202, 'Marlin 6', 1, 'górski', 'L', '29', 'niebieski', 4500.00),
(203, 'Émonda SL 6', 1, 'szosowy', '54 cm', '28', 'czerwony', 14000.00),
(204, 'Fuel EX 8 XT', 1, 'górski', 'L', '29', 'czarny', 18000.00),
(205, 'Roscoe 1', 1, 'górski', 'M', '21.5', 'żółty', 8000.00),
(206, 'Slash 9.8', 1, 'górski', 'L', '29', 'niebieski', 28000.00),
(207, 'Madone SLR 1', 1, 'szosowy', '56 cm', '28', 'czarny', 32000.00),
(208, 'X-Caliber 8', 1, 'górski', 'M', '29', 'czerwony', 6000.00),
(209, 'Procaliber 9.1', 1, 'górski', 'L', '29', 'zielony', 11000.00),
(210, 'Checkpoint ALR 5', 1, 'szosowy', '58 cm', '28', 'niebieski', 9000.00),
(211, 'Farley 1', 1, 'fatbike', 'M', '26', 'biały', 10000.00),
(212, 'Powerfly FS 4', 1, 'elektryczny', 'L', '29', 'czarny', 16000.00),
(213, 'Procaliber 6', 1, 'górski', 'M', '29', 'czerwony', 8000.00),
(214, 'Dual Sport 2', 1, 'miejski', 'L', '28', 'szary', 3500.00),
(215, 'FX 3 Disc', 1, 'miejski', 'M', '28', 'czarny', 5000.00),
(216, 'Verve 2 Disc Lowstep', 1, 'miejski', 'L', '28', 'niebieski', 4500.00),
(217, 'Remedy 8', 1, 'górski', 'L', '29', 'czarny', 19000.00),
(218, 'Dual Sport 4', 1, 'miejski', 'M', '28', 'zielony', 6500.00),
(219, 'Rail 9.1', 1, 'elektryczny', 'L', '29', 'czerwony', 25000.00),
(220, 'Émonda ALR 5 Disc', 1, 'szosowy', '54 cm', '28', 'czarny', 8000.00),
(221, 'Top Fuel 9.9 XX1 AXS', 1, 'górski', 'M', '29', 'niebieski', 35000.00),
(222, 'Marlin 5', 1, 'górski', 'L', '29', 'szary', 4000.00),
(223, 'Roscoe 6', 1, 'górski', 'M', '21.5', 'czerwony', 1000.00),
(224, 'Slash 8', 1, 'górski', 'L', '29', 'zielony', 22000.00);

--
-- Indeksy dla zrzutów tabel
--

--
-- Indeksy dla tabeli `producenci`
--
ALTER TABLE `producenci`
  ADD PRIMARY KEY (`id`);

--
-- Indeksy dla tabeli `rowery`
--
ALTER TABLE `rowery`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `producenci`
--
ALTER TABLE `producenci`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `rowery`
--
ALTER TABLE `rowery`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=225;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
